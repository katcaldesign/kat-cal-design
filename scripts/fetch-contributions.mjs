/*
  fetch-contributions: pulls the real GitHub contribution calendar into a JSON
  file the site can build against.

  WHY THIS EXISTS
  ---------------
  Same reason as optimize-images next door. The site is a static export, so
  there is no server at request time to ask GitHub anything. Whatever the
  contribution graph shows has to be decided on the build machine and baked
  into the HTML.

  There is a second reason too. The contribution calendar is not in GitHub's
  public REST API. It only exists in the GraphQL API, and that always requires a
  token. A token cannot ship to a browser, so a client-side fetch was never an
  option: it has to happen here, where the secret stays on the build machine.

  WHAT IT READS AND WRITES
  ------------------------
    env GH_CONTRIBUTIONS_TOKEN   a personal access token with `read:user`
      -> lib/contributions-data.json   53 x 7 grid of levels, committed

  Runs automatically via the `prebuild` hook, and by hand with:
    npm run contributions

  IF THERE IS NO TOKEN (which is the normal case on your laptop) it leaves the
  committed JSON exactly as it found it and carries on. The build never fails
  because of this script. Only if the file is missing entirely does it invent a
  plausible year, so that a fresh clone still builds.

  WHY THE JSON IS COMMITTED rather than gitignored like `public/_img/`: it is
  the fallback. If the token expires or GitHub has a bad morning, the deploy
  still ships the last good calendar instead of an empty grid.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "contributions-data.json");

const LOGIN = "katcaldesign";
const WEEKS = 53; // columns. GitHub shows a rolling year
const DAYS = 7; //   rows. Sunday at the top

/* GitHub's own four intensity steps, so the colours match what your profile
   shows rather than thresholds we made up. NONE is the empty square. */
const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

async function fetchCalendar(token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "katcalapp-build",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub replied ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  /* GraphQL is unusual: it answers 200 OK and puts problems in an `errors`
     array, so a plain response.ok check is not enough to know it worked. */
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error(`No calendar came back for "${LOGIN}"`);
  return calendar;
}

/*
  Turn GitHub's weeks into a fixed 53 x 7 grid.

  Two things need flattening out. GitHub can return 52 or 53 weeks depending on
  where today falls, so we take the last 53 and pad the front if there are
  fewer. And the first and last weeks are partial: the year does not begin on a
  Sunday and today is rarely a Saturday. Those missing cells become "." in the
  levels string, which the component draws as nothing at all, exactly like the
  blank corners on your real profile.
*/
function toGrid(calendar) {
  const weeks = calendar.weeks.slice(-WEEKS);
  const missing = WEEKS - weeks.length;

  const levels = [];
  const counts = [];
  const columnDates = [];

  for (let week = 0; week < WEEKS; week++) {
    const source = week < missing ? null : weeks[week - missing];
    const days = source?.contributionDays ?? [];

    /* Every column's Sunday, worked out from any day we do have by stepping
       back its weekday number. Used for the month labels, and it has to exist
       even for a column whose Sunday is outside the range. */
    const anchor = days[0];
    if (anchor) {
      const sunday = new Date(`${anchor.date}T00:00:00Z`);
      sunday.setUTCDate(sunday.getUTCDate() - anchor.weekday);
      columnDates.push(sunday.toISOString().slice(0, 10));
    } else {
      columnDates.push(null);
    }

    for (let day = 0; day < DAYS; day++) {
      const match = days.find((d) => d.weekday === day);
      levels.push(match ? String(LEVELS[match.contributionLevel] ?? 0) : ".");
      counts.push(match ? match.contributionCount : 0);
    }
  }

  return {
    source: "github",
    login: LOGIN,
    fetchedAt: new Date().toISOString(),
    total: calendar.totalContributions,
    columnDates,
    levels: levels.join(""),
    counts,
  };
}

/*
  The stand-in year, used only when there is no JSON on disk at all.

  It is shaped like a real one rather than being one: quiet through autumn and
  winter, waking up in spring, busy through summer. mulberry32 is a tiny seeded
  random number generator, so the same seed gives the same year every time and
  two machines building the same commit produce identical output.
*/
function inventYear() {
  let seed = 20260916;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const levelFor = (count) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 7) return 3;
    return 4;
  };

  const levels = [];
  const counts = [];
  const columnDates = [];
  let total = 0;

  // Walk back from the most recent Sunday so the columns land on real dates.
  const lastSunday = new Date();
  lastSunday.setUTCHours(0, 0, 0, 0);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - lastSunday.getUTCDay());

  for (let week = 0; week < WEEKS; week++) {
    const sunday = new Date(lastSunday);
    sunday.setUTCDate(sunday.getUTCDate() - (WEEKS - 1 - week) * 7);
    columnDates.push(sunday.toISOString().slice(0, 10));

    for (let day = 0; day < DAYS; day++) {
      const progress = week / (WEEKS - 1);
      let chance = Math.min(0.85, 0.16 + 0.95 * Math.pow(progress, 2.2));
      if (day === 0 || day === 6) chance *= 0.45; // weekends are quieter

      const count = random() < chance ? 1 + Math.floor(Math.pow(random(), 3) * 8) : 0;
      total += count;
      counts.push(count);
      levels.push(String(levelFor(count)));
    }
  }

  return {
    source: "generated",
    login: LOGIN,
    fetchedAt: new Date().toISOString(),
    total,
    columnDates,
    levels: levels.join(""),
    counts,
  };
}

function write(data) {
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
}

const token = process.env.GH_CONTRIBUTIONS_TOKEN;

if (token) {
  try {
    const calendar = await fetchCalendar(token);
    const data = toGrid(calendar);
    write(data);
    console.log(`contributions: fetched ${data.total} for ${LOGIN}`);
  } catch (error) {
    /* Never fail the build over this. A stale calendar is a much better outcome
       than a deploy that does not happen. */
    console.warn(`contributions: fetch failed (${error.message})`);
    if (!fs.existsSync(OUT)) {
      write(inventYear());
      console.warn("contributions: no cached file, wrote a stand-in year");
    } else {
      console.warn("contributions: keeping the last good file");
    }
  }
} else if (fs.existsSync(OUT)) {
  console.log("contributions: no GH_CONTRIBUTIONS_TOKEN, using the committed file");
} else {
  write(inventYear());
  console.log("contributions: no token and no file, wrote a stand-in year");
}
