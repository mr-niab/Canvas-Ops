import { useAppContext } from '../AppContext';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';
import { StakeholdersTable } from '../components/StakeholdersTable';

export function StakeholdersView() {
  const { setCurrentView, setStakeholderModalOpen } = useAppContext();

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
        <StakeholdersTable />
      </div>

      <AddStakeholderModal />
    </section>
  );
}
