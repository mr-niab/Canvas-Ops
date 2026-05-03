import { useAppContext } from '../AppContext';

export function Sidebar() {
  const { currentView, setCurrentView, organisation, projects, teams, openProject, selectedProjectId } = useAppContext();
  const teamById = new Map(teams.map(t => [t.id, t]));
  const recentProjects = projects.slice(0, 4);

  return (
    <aside className="sidebar">
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
        onClick={() => setCurrentView('home')}
      >
        Home
      </button>
      <button 
        className={`nav-btn ${currentView === 'project' ? 'active' : ''}`}
        onClick={() => setCurrentView('project')}
      >
        Project detail
      </button>
      <button 
        className={`nav-btn ${currentView === 'work' ? 'active' : ''}`}
        onClick={() => setCurrentView('work')}
      >
        Workflow
      </button>
      <button 
        className={`nav-btn ${currentView === 'stakeholders' ? 'active' : ''}`}
        onClick={() => setCurrentView('stakeholders')}
      >
        Stakeholders
      </button>
      <button 
        className={`nav-btn ${currentView === 'log' ? 'active' : ''}`}
        onClick={() => setCurrentView('log')}
      >
        Project log
      </button>
      <button
        className={`nav-btn ${currentView === 'people' ? 'active' : ''}`}
        onClick={() => setCurrentView('people')}
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
            onClick={() => openProject(p.id)}
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
