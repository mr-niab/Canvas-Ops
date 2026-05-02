import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Discipline } from '../../types';

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
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">Discipline</label>
          <select className="field-input" value={discipline} onChange={e => setDiscipline(e.target.value as Discipline)}>
            <option value="UX/UI Design">UX / UI Design</option>
            <option value="User Research">User Research</option>
            <option value="Service Design">Service Design</option>
          </select>
        </div>
        <div>
          <label className="field-label">Title</label>
          <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Booking flow accessibility audit" autoFocus />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="field-input" value={status} onChange={e => setStatus(e.target.value)}>
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
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add task</button>
        </div>
      </form>
    </Modal>
  );
}
