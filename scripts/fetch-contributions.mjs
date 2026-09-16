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
      -> lib/contributions-data.json   53 x 7 grid of raw counts, committed

  Runs automatically via the `prebuild` hook, and by hand with:
    npm run contributions

  IF THERE IS NO TOKEN (which is the normal case on your laptop) it leaves the
  committed JSON exactly as it found it and carries on. The build never fails
  because of this script. Only if the file is missing entirely does it invent a
  plausible year, so that a fresh clone still builds.

  It stores RAW COUNTS, not colour levels. Turning a count into one of the
  intensity steps is a display decision, so it lives with the display code in
  lib/contributions.ts. Keeping it out of here means the ramp can be retuned
  without refetching anything.

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
      /* null, not 0. A day with no commits and a cell that is not a day at all
         look the same in a count but must not look the same on screen. */
      counts.push(match ? match.contributionCount : null);
    }
  }

  return {
    source: "github",
    login: LOGIN,
    fetchedAt: new Date().toISOString(),
    total: calendar.totalContributions,
    columnDates,
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

  const counts = [];
  const columnDates = [];
  let total = 0;

  // Walk back from the most recent Sunday so the columns land on real dates.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - lastSunday.getUTCDay());

  for (let week = 0; week < WEEKS; week++) {
    const sunday = new Date(lastSunday);
    sunday.setUTCDate(sunday.getUTCDate() - (WEEKS - 1 - week) * 7);
    columnDates.push(sunday.toISOString().slice(0, 10));

    for (let day = 0; day < DAYS; day++) {
      const date = new Date(sunday);
      date.setUTCDate(date.getUTCDate() + day);

      /* Days in the rest of this week have not happened, so they are not days
         yet. Marking them null rather than 0 gives the stand-in the same ragged
         bottom-right corner a real calendar has, and exercises that path
         locally instead of only in production. */
      if (date > today) {
        counts.push(null);
        continue;
      }

      const progress = week / (WEEKS - 1);
      let chance = Math.min(0.6, 0.06 + 0.5 * Math.pow(progress, 2.2));
      if (day === 0 || day === 6) chance *= 0.45; // weekends are quieter

      /* A long tail on purpose: most active days are one or two commits and a
         handful are twenty-plus, which is the shape a real year has and what
         the adaptive thresholds in lib/contributions.ts expect to work on.

         The overall rate is also kept low enough that the year has fewer active
         days than the word has lit cells (112). The animation moves the word's
         squares into the year's, so with more targets than squares some cells
         would have to appear out of nowhere at the end. A real year comfortably
         clears that bar; the stand-in should not be the thing that breaks it. */
      const count = random() < chance ? 1 + Math.floor(Math.pow(random(), 4) * 18) : 0;
      total += count;
      counts.push(count);
    }
  }

  return {
    source: "generated",
    login: LOGIN,
    fetchedAt: new Date().toISOString(),
    total,
    columnDates,
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
