import { useAppContext } from '../AppContext';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';
import { StakeholdersTable } from '../components/StakeholdersTable';

export function StakeholdersView() {
  const { setCurrentView, setStakeholderModalOpen, projects, selectedProjectId } = useAppContext();
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null;
  const crumbLabel = project ? `← ${project.name}` : '← Projects';
  const crumbTarget = project ? 'project' : 'home';

  return (
    <section>
      <div className="page-head">
        <div>
          <button type="button" className="crumb" onClick={() => setCurrentView(crumbTarget)}>{crumbLabel}</button>
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
