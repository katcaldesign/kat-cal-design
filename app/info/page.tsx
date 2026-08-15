import ExperienceJourney from "../components/ExperienceJourney";

export default function About() {
  return (
    <div className="max-w-3xl">
      <section className="max-w-2xl">
        <p className="kat-mono-sm uppercase tracking-wider text-ink-light">About</p>
        <h1 className="kat-body-xl mt-4 font-medium text-ink">Katie Calvert</h1>
        <p className="kat-body-md mt-6 text-ink-mid">
          I&apos;m a systems-focused product designer based in London, currently Senior Product
          Designer at Ffern. I work across UX and increasingly UI — this site is where I&apos;m
          sharpening my craft in public.
        </p>
      </section>

      <div className="mt-12">
        <ExperienceJourney />
      </div>
    </div>
  );
}
