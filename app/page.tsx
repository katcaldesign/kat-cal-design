import ExperienceJourney from "./components/ExperienceJourney";

/*
  The landing page IS the info page. There's no separate homepage any more, so
  arriving at "/" tells you who I am straight away and the nav's "info" row
  points here rather than at a route of its own.
*/
export default function Info() {
  return (
    <div className="max-w-3xl">
      <section className="max-w-2xl">
        <p className="kat-mono-sm uppercase tracking-wider text-ink-light">Info</p>
        <h1 className="kat-body-xl mt-4 font-medium text-ink">Katie Calvert</h1>
        <p className="kat-body-md mt-6 text-ink-mid">
          I&apos;m a systems-focused product designer based in London, currently Senior Product
          Designer at Ffern.
        </p>
      </section>

      <div className="mt-12">
        <ExperienceJourney />
      </div>
    </div>
  );
}
