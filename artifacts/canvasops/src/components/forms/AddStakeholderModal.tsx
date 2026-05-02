import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--muted)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  fontWeight: 700,
};

const STATUS_OPTIONS: Array<{ label: string; cls: string }> = [
  { label: 'Aligned', cls: 'good' },
  { label: 'Needs update', cls: 'risk' },
  { label: 'Watching', cls: 'disc' },
  { label: 'Not contacted', cls: 'blocked' },
];

export function AddStakeholderModal() {
  const { isStakeholderModalOpen, setStakeholderModalOpen, addStakeholder } = useAppContext();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);

  const reset = () => {
    setName(''); setRole(''); setEmail(''); setStatusIdx(0);
  };

  const close = () => {
    reset();
    setStakeholderModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const status = STATUS_OPTIONS[statusIdx];
    addStakeholder({
      name: name.trim(),
      role: role.trim() || '—',
      email: email.trim() || '—',
      lastContacted: '—',
      status: status.label,
      statusClass: status.cls,
    });
    close();
  };

  return (
    <Modal isOpen={isStakeholderModalOpen} onClose={close} title="Add stakeholder">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sasha Patel" autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <input style={inputStyle} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Service owner" />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={statusIdx} onChange={e => setStatusIdx(Number(e.target.value))}>
            {STATUS_OPTIONS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add stakeholder</button>
        </div>
      </form>
    </Modal>
  );
}
