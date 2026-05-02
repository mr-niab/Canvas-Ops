import { useAppContext } from '../AppContext';
import { AddLogEntryModal } from '../components/forms/AddLogEntryModal';
import { LogList } from '../components/LogList';

export function LogView() {
  const { setCurrentView, setLogModalOpen } = useAppContext();

  return (
    <section>
      <div className="page-head">
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, cursor: 'pointer' }} onClick={() => setCurrentView('project')}>← Appointment Booking Redesign</div>
          <h1>Project log</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Chronological record of conversations, decisions, files, and key activity for this project.</p>
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
