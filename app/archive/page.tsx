import { getArchiveProjects } from "../../lib/archive-loader";
import ArchiveGrid from "../components/ArchiveGrid";

// Server component: reads the markdown files at build time and hands the typed
// projects to the client grid.
export default function Archive() {
  const projects = getArchiveProjects();

  return (
    <section>
      {/* Header + subtitle removed for now (may re-add). Page opens straight
          into the filter chips + tile grid. */}
      <ArchiveGrid projects={projects} />
    </section>
  );
}
