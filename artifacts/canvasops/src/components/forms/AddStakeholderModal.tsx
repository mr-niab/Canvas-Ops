import { useId, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';

const STATUS_OPTIONS: Array<{ label: string; cls: string }> = [
  { label: 'Aligned', cls: 'good' },
  { label: 'Needs update', cls: 'risk' },
  { label: 'Watching', cls: 'disc' },
  { label: 'Not contacted', cls: 'blocked' },
];

export function AddStakeholderModal() {
  const {
    isStakeholderModalOpen,
    setStakeholderModalOpen,
    addStakeholder,
    projects,
    stakeholderDepartments,
  } = useAppContext();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [department, setDepartment] = useState('');
  const datalistId = useId();

  const reset = () => {
    setName('');
    setRole('');
    setEmail('');
    setStatusIdx(0);
    setProjectId('');
    setDepartment('');
  };

  const close = () => {
    reset();
    setStakeholderModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const status = STATUS_OPTIONS[statusIdx];
    const trimmedDept = department.trim();
    addStakeholder({
      name: name.trim(),
      role: role.trim() || '—',
      email: email.trim() || '—',
      lastContacted: '—',
      status: status.label,
      statusClass: status.cls,
      projectId: projectId || null,
      department: trimmedDept || null,
    });
    close();
  };

  return (
    <Modal isOpen={isStakeholderModalOpen} onClose={close} title="Add stakeholder">
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">Name</label>
          <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sasha Patel" autoFocus />
        </div>
        <div>
          <label className="field-label">Role</label>
          <input className="field-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Service owner" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <label className="field-label">Project</label>
          <select className="field-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Department</label>
          <input
            className="field-input"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="e.g. Design, Engineering"
            list={datalistId}
          />
          <datalist id={datalistId}>
            {stakeholderDepartments.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="field-input" value={statusIdx} onChange={e => setStatusIdx(Number(e.target.value))}>
            {STATUS_OPTIONS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add stakeholder</button>
        </div>
      </form>
    </Modal>
  );
}
