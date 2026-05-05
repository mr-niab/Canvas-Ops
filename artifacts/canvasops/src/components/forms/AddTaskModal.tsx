import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Discipline, TaskPriority } from '../../types';
import { DependencyPicker } from './DependencyPicker';

export function AddTaskModal() {
  const { isTaskModalOpen, setTaskModalOpen, addTask, tasks, teammates } = useAppContext();
  const [discipline, setDiscipline] = useState<Discipline>('UX/UI Design');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('Backlog');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [assignee, setAssignee] = useState('');

  const reset = () => {
    setDiscipline('UX/UI Design');
    setTitle('');
    setStatus('Backlog');
    setDependencies([]);
    setPriority('');
    setAssignee('');
  };

  const close = () => {
    reset();
    setTaskModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      discipline,
      title: title.trim(),
      status: status.trim() || 'Backlog',
      dependencies,
      ...(priority ? { priority } : {}),
      ...(assignee ? { assignee } : {}),
    });
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
        <div>
          <label className="field-label" htmlFor="add-task-priority">Priority (optional)</label>
          <select
            id="add-task-priority"
            className="field-input"
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority | '')}
          >
            <option value="">— None —</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="add-task-assignee">Assignee (optional)</label>
          <select
            id="add-task-assignee"
            className="field-input"
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {teammates.map(tm => (
              <option key={tm.id} value={tm.name}>{tm.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Depends on (optional)</label>
          <DependencyPicker
            allTasks={tasks}
            value={dependencies}
            onChange={setDependencies}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add task</button>
        </div>
      </form>
    </Modal>
  );
}
