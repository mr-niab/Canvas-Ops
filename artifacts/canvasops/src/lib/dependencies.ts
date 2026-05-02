import { Discipline, Task } from '../types';

export const DONE_STATUSES: ReadonlyArray<string> = ['Done', 'Complete'];

export const BLOCKED_STATUS = 'Blocked';

export const DEFAULT_RESTORE_STATUS = 'Backlog';

export function isTaskDone(task: Task): boolean {
  return DONE_STATUSES.includes(task.status);
}

export function unmetDependencies(task: Task, allTasks: Task[]): Task[] {
  if (!task.dependencies || task.dependencies.length === 0) return [];
  const byId = new Map(allTasks.map(t => [t.id, t]));
  const out: Task[] = [];
  for (const depId of task.dependencies) {
    const dep = byId.get(depId);
    if (!dep) continue;
    if (!isTaskDone(dep)) out.push(dep);
  }
  return out;
}

/**
 * Returns true if assigning `proposedDeps` as the dependency list of `taskId`
 * would create a cycle in the dependency graph (e.g. A → B → A).
 *
 * The check works against the *current* dependency graph: a cycle through `taskId`
 * can only form if some proposed dep can already reach `taskId` via existing edges.
 */
export function wouldCreateCycle(
  taskId: string,
  proposedDeps: string[],
  allTasks: Task[]
): boolean {
  if (proposedDeps.includes(taskId)) return true;
  const byId = new Map(allTasks.map(t => [t.id, t]));
  for (const startId of proposedDeps) {
    const visited = new Set<string>();
    const stack: string[] = [startId];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      if (cur === taskId) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const node = byId.get(cur);
      if (!node) continue;
      for (const next of node.dependencies ?? []) stack.push(next);
    }
  }
  return false;
}

/**
 * Reflects each task's dependency state in its `status` field:
 *  - If a task has at least one unfinished dependency and its status isn't
 *    already "Blocked", store the current status as `previousStatus` and set
 *    status to "Blocked".
 *  - If a task has no unfinished dependencies and its status is "Blocked",
 *    restore status from `previousStatus` (falling back to "Backlog") and
 *    clear `previousStatus`.
 *
 * Iterates to a fixed point so that effects propagate through chains —
 * e.g. when a blocked task whose `previousStatus` is "Done" gets restored,
 * any dependents pointing at it are also unblocked in the same call.
 *
 * Idempotent: calling repeatedly on already-reconciled tasks is a no-op
 * (returns the same array reference).
 */
export function recomputeBlockedStates(tasks: Task[]): Task[] {
  // Defensive cap so a pathological dependency graph can't run forever.
  // Each iteration must change at least one task to continue, so the worst
  // case is bounded by the number of tasks.
  const maxIterations = tasks.length + 1;
  let current = tasks;
  let everChanged = false;

  for (let i = 0; i < maxIterations; i++) {
    let changedThisPass = false;
    const next = current.map(t => {
      const unmet = unmetDependencies(t, current);
      if (unmet.length > 0) {
        if (t.status === BLOCKED_STATUS) return t;
        changedThisPass = true;
        return { ...t, previousStatus: t.status, status: BLOCKED_STATUS };
      }
      if (t.status === BLOCKED_STATUS) {
        changedThisPass = true;
        const restored = t.previousStatus ?? DEFAULT_RESTORE_STATUS;
        const { previousStatus: _omit, ...rest } = t;
        void _omit;
        return { ...rest, status: restored };
      }
      if (t.previousStatus !== undefined) {
        changedThisPass = true;
        const { previousStatus: _omit, ...rest } = t;
        void _omit;
        return rest;
      }
      return t;
    });
    if (!changedThisPass) break;
    everChanged = true;
    current = next;
  }

  return everChanged ? current : tasks;
}

export const DISCIPLINE_ORDER: ReadonlyArray<Discipline> = [
  'UX/UI Design',
  'User Research',
  'Service Design',
];

export function groupTasksByDiscipline(tasks: Task[]): Array<{ discipline: Discipline; tasks: Task[] }> {
  return DISCIPLINE_ORDER.map(discipline => ({
    discipline,
    tasks: tasks.filter(t => t.discipline === discipline),
  })).filter(group => group.tasks.length > 0);
}
