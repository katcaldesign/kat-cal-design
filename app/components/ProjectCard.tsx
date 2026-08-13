type ProjectCardProps = {
    title: string;
    description: string;
    tag: string;
  };
  
  export default function ProjectCard({ title, description, tag }: ProjectCardProps) {
    return (
      <div className="rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <span className="text-xs uppercase tracking-wide text-gray-400">{tag}</span>
        <h3 className="mt-2 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
      </div>
    );
  }
  