import Link from "next/link";
import { WORK_LOCKED } from "../../lib/site-config";
import LockIcon from "../components/LockIcon";
import WorkCases from "../components/WorkCases";

/*
  The work page has two states, chosen by the WORK_LOCKED flag in
  lib/site-config.ts — the same flag that padlocks the nav row.

  Locking the nav alone would only hide the door: anyone typing /work, or
  following an old link, would still walk straight into the unfinished case
  studies. So the page checks the flag too, and the real content below is
  untouched and waiting — flip the flag and it returns exactly as it was.
*/
export default function Work() {
  if (WORK_LOCKED) {
    return (
      <section className="max-w-3xl">
        <div className="flex items-center gap-3">
          <LockIcon className="h-4 w-4 text-ink-light" />
          <p className="kat-mono-sm uppercase tracking-wider text-ink-light">
            work in progress
          </p>
        </div>
        <h1 className="kat-body-xl mt-4 font-medium text-balance text-ink">
          Selected work is being rewritten
        </h1>
        <p className="kat-body-md mt-6 text-ink-mid">
          The case studies are locked while I rework them. In the meantime, the{" "}
          <Link className="underline underline-offset-4 hover:text-ink" href="/archive">
            archive
          </Link>{" "}
          has the older projects, and the{" "}
          <Link className="underline underline-offset-4 hover:text-ink" href="/">
            info page
          </Link>{" "}
          has the short version.
        </p>
      </section>
    );
  }

  return (
    // Wider than the other pages: the index rows and (on desktop) the panel
    // want room. Still capped so lines stay readable.
    <section className="max-w-3xl">
      <h1 className="kat-body-xl font-medium text-balance text-ink">Selected work</h1>

      {/* The interactive index + shared detail panel (client component). */}
      <WorkCases />
    </section>
  );
}
