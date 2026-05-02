import { useAppContext } from '../AppContext';

export function Sidebar() {
  const { currentView, setCurrentView } = useAppContext();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        CanvasOps
      </div>

      <div className="nav-label">Workspace</div>
      <button 
        className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => setCurrentView('home')}
      >
        <span className="dot"></span>Home
      </button>
      <button 
        className={`nav-btn ${currentView === 'project' ? 'active' : ''}`}
        onClick={() => setCurrentView('project')}
      >
        <span className="dot"></span>Project detail
      </button>
      <button 
        className={`nav-btn ${currentView === 'work' ? 'active' : ''}`}
        onClick={() => setCurrentView('work')}
      >
        <span className="dot"></span>Workflow
      </button>
      <button 
        className={`nav-btn ${currentView === 'stakeholders' ? 'active' : ''}`}
        onClick={() => setCurrentView('stakeholders')}
      >
        <span className="dot"></span>Stakeholders
      </button>
      <button 
        className={`nav-btn ${currentView === 'log' ? 'active' : ''}`}
        onClick={() => setCurrentView('log')}
      >
        <span className="dot"></span>Project log
      </button>

      <div className="nav-label">Recent projects</div>
      <button className="nav-btn" onClick={() => setCurrentView('project')}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--service)', flexShrink: 0 }}></span>
        Appointment Booking
      </button>
      <button className="nav-btn" onClick={() => setCurrentView('project')}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--warn)', flexShrink: 0 }}></span>
        Staff Portal v2
      </button>
      <button className="nav-btn" onClick={() => setCurrentView('project')}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: 'var(--primary)', flexShrink: 0 }}></span>
        Payment Journey
      </button>
    </aside>
  );
}
