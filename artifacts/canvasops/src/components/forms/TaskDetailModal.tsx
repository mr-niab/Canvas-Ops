import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Task } from '../../types';
import { wouldCreateCycle } from '../../lib/dependencies';
import { DependencyPicker } from './DependencyPicker';

export function TaskDetailModal() {
  const { tasks, editingTaskId, setEditingTaskId, updateTaskDependencies } = useAppContext();
  const task: Task | null = useMemo(
    () => (editingTaskId ? tasks.find(t => t.id === editingTaskId) ?? null : null),
    [editingTaskId, tasks]
  );

  const [draftDeps, setDraftDeps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
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
    if (wouldCreateCycle(task.id, draftDeps, tasks)) {
      setError("That would create a circular dependency — two items can't depend on each other.");
      return;
    }
    updateTaskDependencies(task.id, draftDeps);
    close();
  };

  return (
    <Modal isOpen={!!editingTaskId} onClose={close} title={task.title}>
      <form onSubmit={handleSave} className="form-grid">
        <div className="task-detail-meta">
          <span className="badge disc">{task.discipline}</span>
          <span className="muted-meta">{task.status}</span>
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
