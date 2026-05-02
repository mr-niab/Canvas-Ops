import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Discipline, Task } from '../../types';
import { wouldCreateCycle } from '../../lib/dependencies';
import { DependencyPicker } from './DependencyPicker';

export function TaskDetailModal() {
  const { tasks, editingTaskId, setEditingTaskId, updateTask, updateTaskDependencies } = useAppContext();
  const task: Task | null = useMemo(
    () => (editingTaskId ? tasks.find(t => t.id === editingTaskId) ?? null : null),
    [editingTaskId, tasks]
  );

  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState('Backlog');
  const [draftDiscipline, setDraftDiscipline] = useState<Discipline>('UX/UI Design');
  const [draftDeps, setDraftDeps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const STATUS_PRESETS = [
    'Backlog',
    'Designing',
    'In progress',
    'In review',
    'Needs review',
    'Ready for session',
    'Complete',
    'Done',
  ];

  useEffect(() => {
    if (task) {
      setDraftTitle(task.title);
      setDraftStatus(task.status);
      setDraftDiscipline(task.discipline);
      setDraftDeps(task.dependencies ?? []);
      setError(null);
    }
  }, [task]);

  const close = () => {
    setEditingTaskId(null);
    setError(null);
  };

  // Pre-compute which other tasks would create a cycle if added — so we can
  // disable them in the picker before the user even tries.
  const cyclicIds = useMemo(() => {
    if (!task) return [] as string[];
    const ids: string[] = [];
    for (const candidate of tasks) {
      if (candidate.id === task.id) continue;
      if (draftDeps.includes(candidate.id)) continue;
      if (wouldCreateCycle(task.id, [...draftDeps, candidate.id], tasks)) {
        ids.push(candidate.id);
      }
    }
    return ids;
  }, [task, tasks, draftDeps]);

  if (!task) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (wouldCreateCycle(task.id, draftDeps, tasks)) {
      setError("That would create a circular dependency — two items can't depend on each other.");
      return;
    }
    updateTask(task.id, {
      title: trimmedTitle,
      status: draftStatus.trim() || 'Backlog',
      discipline: draftDiscipline,
    });
    updateTaskDependencies(task.id, draftDeps);
    close();
  };

  return (
    <Modal isOpen={!!editingTaskId} onClose={close} title="Edit task">
      <form onSubmit={handleSave} className="form-grid">
        <div>
          <label className="field-label">Title</label>
          <input
            className="field-input"
            value={draftTitle}
            onChange={e => {
              setDraftTitle(e.target.value);
              setError(null);
            }}
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Discipline</label>
          <select
            className="field-input"
            value={draftDiscipline}
            onChange={e => setDraftDiscipline(e.target.value as Discipline)}
          >
            <option value="UX/UI Design">UX / UI Design</option>
            <option value="User Research">User Research</option>
            <option value="Service Design">Service Design</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="task-detail-status">Status</label>
          <input
            id="task-detail-status"
            className="field-input"
            list="task-detail-status-presets"
            value={draftStatus}
            onChange={e => setDraftStatus(e.target.value)}
            placeholder="e.g. In progress"
          />
          <datalist id="task-detail-status-presets">
            {STATUS_PRESETS.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="field-label">Depends on</label>
          <DependencyPicker
            allTasks={tasks}
            excludeTaskId={task.id}
            value={draftDeps}
            onChange={(next) => {
              setDraftDeps(next);
              setError(null);
            }}
            disabledIds={cyclicIds}
            disabledReason="Adding this would create a circular dependency."
          />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
