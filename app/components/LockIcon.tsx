/*
  LockIcon — a tiny padlock, drawn as inline SVG.

  WHY INLINE SVG rather than an emoji or an image file?
  ----------------------------------------------------
  Inline SVG inherits the text colour (stroke="currentColor"), so the padlock
  fades and brightens along with the row it sits in — no second colour to keep
  in sync. It also costs no network request, and it scales crisply at any size.

  Sized by className (default h-3 w-3) so callers decide how big it is.
*/
export default function LockIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* the body of the padlock */}
      <rect x="4" y="10" width="16" height="11" rx="2" />
      {/* the shackle — a half-circle arc rising out of the body */}
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
