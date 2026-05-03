import { useState } from 'react';
import { useAppContext } from '../AppContext';
import { exportScreens } from '../lib/exportScreens';

interface SidebarProps {
  mobileOpen?: boolean;
  hidden?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobileOpen = false, hidden = false, onNavigate }: SidebarProps) {
  const {
    currentView,
    setCurrentView,
    organisation,
    projects,
    teams,
    openProject,
    selectedProjectId,
    setSelectedProjectId,
  } = useAppContext();
  const teamById = new Map(teams.map(t => [t.id, t]));
  const recentProjects = projects.slice(0, 4);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const go = (view: typeof currentView) => {
    setCurrentView(view);
    onNavigate?.();
  };

  const goProject = (id: string) => {
    openProject(id);
    onNavigate?.();
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setProgress('Preparing…');
    const previousView = currentView;
    const previousProjectId = selectedProjectId;
    const repProjectId = selectedProjectId ?? projects[0]?.id ?? null;
    try {
      await exportScreens({
        setCurrentView,
        setSelectedProjectId,
        representativeProjectId: repProjectId,
        previousView,
        previousProjectId,
        onProgress: (current, total, label) => {
          setProgress(`Capturing ${label} (${current}/${total})…`);
        },
      });
    } catch (err) {
      console.error('Export failed', err);
      window.alert('Export failed. See console for details.');
    } finally {
      setExporting(false);
      setProgress('');
    }
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

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-btn export-btn"
          onClick={handleExport}
          disabled={exporting}
          aria-busy={exporting}
        >
          {exporting ? (
            <span className="nav-btn-text">
              Exporting…
              {progress && <small className="nav-btn-sub">{progress}</small>}
            </span>
          ) : (
            'Export screens'
          )}
        </button>
      </div>
    </aside>
  );
}
