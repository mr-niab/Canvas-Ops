import { useAppContext } from '../AppContext';
import { Project } from '../types';

function MiniProgress({ done, total, activeAt }: { done: number; total: number; activeAt?: number }) {
  return (
    <div className="mini">
      {Array.from({ length: total }).map((_, i) => {
        let cls = '';
        if (i < done) cls = 'done';
        else if (i === activeAt) cls = 'active';
        return <span key={i} className={cls}></span>;
      })}
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const done = project.status === 'Shipped' ? project.totalProgress : Math.max(0, project.progress - 1);
  const activeAt = project.status === 'Shipped' ? -1 : project.progress - 1;
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
      </div>
      <MiniProgress done={done} total={project.totalProgress} activeAt={activeAt} />
      <div className="project-card-open">Open →</div>
    </div>
  );
}

export function HomeView() {
  const { projects, setCurrentView } = useAppContext();
  const openProject = () => setCurrentView('project');

  return (
    <section>
      <h1>Projects at a glance</h1>
      <p className="sub">Open a project to navigate across its workflow, evidence, stakeholders, resources, and activity log.</p>

      <div className="card pad">
        <div className="project-strip">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={openProject} />
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="list-item">
            <div className="section-title flush">My actions today</div>
          </div>
          <div className="list-item">
            <div className="item-title">Review synthesis report</div>
            <div className="item-sub">Staff Portal v2 · Research · Awaiting your comments</div>
          </div>
          <div className="list-item">
            <div className="item-title">Update service blueprint</div>
            <div className="item-sub">Appointment Booking · Service Design · Overdue</div>
          </div>
          <div className="list-item">
            <div className="item-title">Approve stakeholder playback deck</div>
            <div className="item-sub">Appointment Booking · UX/UI · Session Wed 3pm</div>
          </div>
          <div className="list-item">
            <div className="item-title" style={{ color: 'var(--muted)', fontWeight: 400 }}>+ Add action</div>
          </div>
        </div>

        <div className="stack">
          <div className="card pad">
            <div className="section-title tight">Quick stats</div>
            <div className="kpi">
              <div className="card pad">
                <div className="muted">Active projects</div>
                <strong>12</strong>
              </div>
              <div className="card pad">
                <div className="muted">Awaiting review</div>
                <strong>4</strong>
              </div>
              <div className="card pad">
                <div className="muted">Stakeholders</div>
                <strong>26</strong>
              </div>
              <div className="card pad">
                <div className="muted">Open log items</div>
                <strong>18</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="low-section card">
        <div className="list-item">
          <div className="section-title flush">Upcoming sessions</div>
        </div>
        <div className="list-item">
          <div className="item-title">Design crit — Appointment Booking</div>
          <div className="item-sub">Mon 2:00pm · UX/UI team · Booking confirmation + error flows</div>
        </div>
        <div className="list-item">
          <div className="item-title">Research debrief — Staff Portal v2</div>
          <div className="item-sub">Tue 10:00am · Research + UX/UI · Round 2 synthesis</div>
        </div>
        <div className="list-item">
          <div className="item-title">Stakeholder playback — Appointment Booking</div>
          <div className="item-sub">Wed 3:00pm · Project team + stakeholders · Service findings</div>
        </div>
        <div className="list-item">
          <div className="item-title">Stage gate review — Appointment Booking</div>
          <div className="item-sub">Thu 2:00pm · All disciplines · Beta → Live readiness</div>
        </div>
      </div>
    </section>
  );
}
