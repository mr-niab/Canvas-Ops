import { useAppContext } from '../AppContext';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';
import { StakeholdersTable } from '../components/StakeholdersTable';

export function StakeholdersView() {
  const { setCurrentView, setStakeholderModalOpen } = useAppContext();

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="crumb" onClick={() => setCurrentView('project')}>← Appointment Booking Redesign</div>
          <h1>Stakeholders</h1>
          <p className="sub flush">People connected to this project — recorded with role, email, last contact, and alignment status.</p>
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
