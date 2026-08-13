"use client";

/*
  Header — the shared top bar on every page.

  WHY "use client" (the first line)?
  ----------------------------------
  By default every component in the app is a SERVER component: it renders to
  HTML on the server and ships zero JavaScript. That's great for static stuff,
  but this header needs to *react to the browser* — it listens to scroll
  position and reads the current URL. Those are browser-only powers (useState,
  useEffect, window). Declaring "use client" opts this one component into
  running in the browser so it can do that. Keep the directive on the smallest
  piece that needs it (this bar), so the rest of the site stays server-rendered.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CatLogo from "./CatLogo";

// The nav is just data — one array. Add/reorder pages here and the header
// updates itself. (This is the "content as data" idea you'll see everywhere.)
const NAV = [
  { href: "/", label: "home" },
  { href: "/about", label: "about" },
  { href: "/portfolio", label: "portfolio" },
  { href: "/archive", label: "archive" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`kat-mono-sm inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors ${
        active ? "text-ink" : "text-ink-mid hover:text-ink"
      }`}
    >
      {label}
      {/* The active-page marker — the one spot the chartreuse accent shows as a
          mark. It's ALWAYS rendered but fades in only when active, so the row
          never shifts sideways between pages (no layout jump). */}
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full bg-accent transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </Link>
  );
}

export default function Header() {
  // usePathname tells this component which route is showing, so we can mark
  // the active nav item. It's a client-only hook — hence "use client" above.
  const pathname = usePathname();

  // A tiny piece of state: is the page scrolled past the top?
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Runs once after the header mounts in the browser. We attach a scroll
    // listener and flip `scrolled` past an 8px threshold.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // set correct state immediately, in case we load mid-page
    window.addEventListener("scroll", onScroll, { passive: true });
    // Cleanup: remove the listener if the header ever unmounts. Forgetting this
    // is a classic memory-leak bug — React runs this return fn on teardown.
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-border bg-bg/70 backdrop-blur-md" // GLASS: translucent bg + blur
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="cat-logo-trigger flex items-center gap-3">
          <CatLogo className="h-16 w-16" />
          <span className="kat-body-xl font-medium text-ink">kat calvert</span>
        </Link>

        <nav className="flex items-center gap-7">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              // "/" must match exactly; the others also match their sub-pages.
              active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
