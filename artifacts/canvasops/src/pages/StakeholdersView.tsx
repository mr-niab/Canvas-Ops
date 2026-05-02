import { useAppContext } from '../AppContext';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';

export function StakeholdersView() {
  const { stakeholders, setCurrentView, setStakeholderModalOpen } = useAppContext();

  return (
    <section>
      <div className="page-head">
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, cursor: 'pointer' }} onClick={() => setCurrentView('project')}>← Appointment Booking Redesign</div>
          <h1>Stakeholders</h1>
          <p className="sub" style={{ marginBottom: 0 }}>People connected to this project — recorded with role, email, last contact, and alignment status.</p>
        </div>
        <button className="btn primary" onClick={() => setStakeholderModalOpen(true)}>+ Add stakeholder</button>
      </div>

      <div className="card pad">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Last contacted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stakeholders.map(s => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.role}</td>
                <td>{s.email}</td>
                <td>{s.lastContacted}</td>
                <td><span className={`badge ${s.statusClass}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddStakeholderModal />
    </section>
  );
}
