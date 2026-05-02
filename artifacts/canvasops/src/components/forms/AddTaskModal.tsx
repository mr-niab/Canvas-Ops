import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Discipline } from '../../types';

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

export function AddTaskModal() {
  const { isTaskModalOpen, setTaskModalOpen, addTask } = useAppContext();
  const [discipline, setDiscipline] = useState<Discipline>('UX/UI Design');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('Backlog');

  const reset = () => {
    setDiscipline('UX/UI Design');
    setTitle('');
    setStatus('Backlog');
  };

  const close = () => {
    reset();
    setTaskModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ discipline, title: title.trim(), status: status.trim() || 'Backlog' });
    close();
  };

  return (
    <Modal isOpen={isTaskModalOpen} onClose={close} title="Add task">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={labelStyle}>Discipline</label>
          <select style={inputStyle} value={discipline} onChange={e => setDiscipline(e.target.value as Discipline)}>
            <option value="UX/UI Design">UX / UI Design</option>
            <option value="User Research">User Research</option>
            <option value="Service Design">Service Design</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Booking flow accessibility audit" autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
            <option>Backlog</option>
            <option>Designing</option>
            <option>In progress</option>
            <option>In review</option>
            <option>Needs review</option>
            <option>Ready for session</option>
            <option>Complete</option>
            <option>Done</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add task</button>
        </div>
      </form>
    </Modal>
  );
}
