import Link from "next/link";

export default function Home() {
  return (
    <section className="max-w-2xl">
      <p className="kat-mono-sm uppercase tracking-wider text-ink-light">
        Systems-focused product designer
      </p>
      <h1 className="kat-body-xl mt-4 font-medium text-balance text-ink">
        Katie Calvert
      </h1>
      <p className="kat-body-md mt-6 text-ink-mid">
        Currently Senior Product Designer at Ffern.
      </p>

      <div className="mt-8 flex items-center gap-6">
        {/* Primary button — chartreuse fill, dark ink (our verified-contrast pairing) */}
        <Link
          href="/work"
          className="kat-mono-sm inline-flex rounded-md bg-btn-primary px-4 py-2 uppercase tracking-wider text-btn-primary-text transition-colors hover:bg-btn-primary-hover"
        >
          View work
        </Link>
        {/* Inline link — dark chartreuse so it stays readable */}
        <Link
          href="/info"
          className="kat-body-md text-link underline underline-offset-4 hover:text-link-hover"
        >
          More about me
        </Link>
      </div>
    </section>
  );
}
