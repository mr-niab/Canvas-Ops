import { useAppContext } from '../AppContext';
import { AddLogEntryModal } from '../components/forms/AddLogEntryModal';
import { LogList } from '../components/LogList';

export function LogView() {
  const { setCurrentView, setLogModalOpen, projects, selectedProjectId } = useAppContext();
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null;
  const crumbLabel = project ? `← ${project.name}` : '← Projects';
  const crumbTarget = project ? 'project' : 'home';

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="crumb" onClick={() => setCurrentView(crumbTarget)}>{crumbLabel}</div>
          <h1>Project log</h1>
          <p className="sub flush">Chronological record of conversations, decisions, files, and key activity for this project.</p>
        </div>
        <button className="btn primary" onClick={() => setLogModalOpen(true)}>+ Add log entry</button>
      </div>

      <div className="card pad">
        <LogList />
      </div>

      <AddLogEntryModal />
    </section>
  );
}
