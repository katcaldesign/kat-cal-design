import WorkCases from "../components/WorkCases";

export default function Work() {
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
