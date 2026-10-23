"use client";

import dynamic from "next/dynamic";

/*
  The DialKit panel, mounted only when the site runs locally.

  Loaded with next/dynamic so the panel and its stylesheet live in a separate
  file the browser only fetches in development. On the live site this
  renders nothing and that file is never requested.
*/
const Panel = dynamic(() => import("./DevDialsPanel"), { ssr: false });

export default function DevDials() {
  return process.env.NODE_ENV === "development" ? <Panel /> : null;
}
