import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Discipline, Task, TaskPriority } from '../../types';
import { wouldCreateCycle } from '../../lib/dependencies';
import { DependencyPicker } from './DependencyPicker';

export function TaskDetailModal() {
  const { tasks, editingTaskId, setEditingTaskId, updateTask, updateTaskDependencies, deleteTask, teammates } = useAppContext();
  const task: Task | null = useMemo(
    () => (editingTaskId ? tasks.find(t => t.id === editingTaskId) ?? null : null),
    [editingTaskId, tasks]
  );

  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState('Backlog');
  const [draftDiscipline, setDraftDiscipline] = useState<Discipline>('UX/UI Design');
  const [draftDeps, setDraftDeps] = useState<string[]>([]);
  const [draftPriority, setDraftPriority] = useState<TaskPriority | ''>('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
      setDraftPriority(task.priority ?? '');
      setDraftAssignee(task.assignee ?? '');
      setError(null);
      setConfirmingDelete(false);
    }
  }, [task]);

  const close = () => {
    setEditingTaskId(null);
    setError(null);
    setConfirmingDelete(false);
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
      priority: draftPriority || null,
      assignee: draftAssignee.trim() || null,
    });
    updateTaskDependencies(task.id, draftDeps);
    close();
  };

  const handleDelete = () => {
    deleteTask(task.id);
  };

  const dependentCount = tasks.filter(
    t => t.id !== task.id && (t.dependencies ?? []).includes(task.id)
  ).length;

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
          <label className="field-label" htmlFor="task-detail-priority">Priority</label>
          <select
            id="task-detail-priority"
            className="field-input"
            value={draftPriority}
            onChange={e => setDraftPriority(e.target.value as TaskPriority | '')}
          >
            <option value="">— None —</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="task-detail-assignee">Assignee</label>
          <select
            id="task-detail-assignee"
            className="field-input"
            value={draftAssignee}
            onChange={e => setDraftAssignee(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {teammates.map(tm => (
              <option key={tm.id} value={tm.name}>{tm.name}</option>
            ))}
          </select>
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
        {confirmingDelete && (
          <div className="form-confirm" role="alertdialog" aria-label="Confirm delete">
            <div className="form-confirm-text">
              Delete <strong>"{task.title}"</strong>? This can't be undone.
              {dependentCount > 0 && (
                <div className="form-confirm-meta">
                  {dependentCount === 1
                    ? '1 other item depends on this — its "Blocked by" chip will be removed.'
                    : `${dependentCount} other items depend on this — their "Blocked by" chips will be removed.`}
                </div>
              )}
            </div>
            <div className="form-confirm-actions">
              <button type="button" className="btn" onClick={() => setConfirmingDelete(false)}>
                Keep
              </button>
              <button type="button" className="btn danger" onClick={handleDelete}>
                Yes, delete
              </button>
            </div>
          </div>
        )}
        <div className="form-actions form-actions-split">
          <button
            type="button"
            className="btn danger-text"
            onClick={() => setConfirmingDelete(true)}
            disabled={confirmingDelete}
          >
            Delete task
          </button>
          <div className="cluster-sm">
            <button type="button" className="btn" onClick={close}>Cancel</button>
            <button type="submit" className="btn primary">Save</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
