/*
  site-config — small, hand-edited switches for the site.

  WORK_LOCKED
  -----------
  The "work" section is a work in progress, so it's sealed off for now. One
  flag drives BOTH halves of that:
    • Sidebar     — the nav row stops being a link and shows a padlock
    • /work page  — direct visits get a short "in progress" note instead

  Flip this to false when the case studies are ready. Nothing else to change:
  the real page content is still sitting in app/work/page.tsx underneath.
*/
export const WORK_LOCKED = true;
