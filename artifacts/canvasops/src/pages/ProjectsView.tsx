import { useAppContext } from '../AppContext';
import { Project } from '../types';

function ProjectCard({
  project,
  teamName,
  onOpen,
}: {
  project: Project;
  teamName?: string;
  onOpen: () => void;
}) {
  return (
    <div
      className="project-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="project-card-head">
        <div className="project-name">{project.name}</div>
        <div className="project-meta">{project.meta}</div>
      </div>
      <div className="project-card-badges">
        <span className={`badge ${project.stageClass}`}>{project.stage}</span>
        <span className={`badge ${project.statusClass}`}>{project.status}</span>
        {teamName && <span className="badge team-badge">{teamName}</span>}
      </div>
      <div className="project-card-open">Open →</div>
    </div>
  );
}

export function ProjectsView() {
  const { projects, teams, openProject, setProjectModalOpen } = useAppContext();
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="sub flush">All projects in your workspace.</p>
        </div>
        <button className="btn primary" onClick={() => setProjectModalOpen(true)}>
          + Add project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card pad">
          <div className="project-strip-empty">
            <h3 className="project-strip-empty-title">No projects yet</h3>
            <p className="project-strip-empty-sub">
              Create a project to start tracking workflow, evidence, and stakeholders.
            </p>
            <button className="btn primary" onClick={() => setProjectModalOpen(true)}>
              Create your first project
            </button>
          </div>
        </div>
      ) : (
        <div className="card pad">
          <div className="project-strip">
            {projects.map((p) => {
              const team = p.teamId ? teamById.get(p.teamId) : undefined;
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  teamName={team?.name}
                  onOpen={() => openProject(p.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
