import { useAppContext } from '../AppContext';

interface SidebarProps {
  mobileOpen?: boolean;
  hidden?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobileOpen = false, hidden = false, onNavigate }: SidebarProps) {
  const { currentView, setCurrentView, organisation, projects, teams, openProject, selectedProjectId } = useAppContext();
  const teamById = new Map(teams.map(t => [t.id, t]));
  const recentProjects = projects.slice(0, 4);

  const go = (view: typeof currentView) => {
    setCurrentView(view);
    onNavigate?.();
  };

  const goProject = (id: string) => {
    openProject(id);
    onNavigate?.();
  };

  return (
    <aside
      id="primary-nav"
      className={`sidebar${mobileOpen ? ' sidebar-mobile-open' : ''}`}
      inert={hidden}
      aria-hidden={hidden || undefined}
    >
      <div className="brand">
        <div className="logo">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        Project Canvas
      </div>
      <div className="workspace-label">{organisation.name}</div>

      <div className="nav-label">Workspace</div>
      <button
        className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => go('home')}
      >
        Home
      </button>
      <button
        className={`nav-btn ${currentView === 'project' ? 'active' : ''}`}
        onClick={() => go('project')}
      >
        Project detail
      </button>
      <button
        className={`nav-btn ${currentView === 'work' ? 'active' : ''}`}
        onClick={() => go('work')}
      >
        Workflow
      </button>
      <button
        className={`nav-btn ${currentView === 'stakeholders' ? 'active' : ''}`}
        onClick={() => go('stakeholders')}
      >
        Stakeholders
      </button>
      <button
        className={`nav-btn ${currentView === 'log' ? 'active' : ''}`}
        onClick={() => go('log')}
      >
        Project log
      </button>
      <button
        className={`nav-btn ${currentView === 'people' ? 'active' : ''}`}
        onClick={() => go('people')}
      >
        People &amp; Teams
      </button>

      <div className="nav-label">Recent projects</div>
      {recentProjects.map(p => {
        const team = p.teamId ? teamById.get(p.teamId) : undefined;
        const isActive = currentView === 'project' && selectedProjectId === p.id;
        return (
          <button
            key={p.id}
            className={`nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => goProject(p.id)}
          >
            <span className="nav-btn-text">
              {p.name}
              {team && <small className="nav-btn-sub">{team.name}</small>}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
