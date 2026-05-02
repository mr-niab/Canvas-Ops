import { useAppContext } from '../AppContext';
import { AddLogEntryModal } from '../components/forms/AddLogEntryModal';

export function LogView() {
  const { logEntries, setCurrentView, setLogModalOpen } = useAppContext();

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
        {logEntries.map(entry => {
          const [date, time] = entry.date.split(' · ');
          return (
            <div className="log-row" key={entry.id}>
              <div className="log-date">{date}{time ? <><br />{time}</> : null}</div>
              <div className="log-actor">{entry.actor}</div>
              <div><span className={`badge ${entry.typeClass}`}>{entry.type}</span></div>
              <div className="log-detail">{entry.detail}</div>
            </div>
          );
        })}
      </div>

      <AddLogEntryModal />
    </section>
  );
}
