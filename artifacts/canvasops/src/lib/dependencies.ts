import { Discipline, Task } from '../types';

export const DONE_STATUSES: ReadonlyArray<string> = ['Done', 'Complete'];

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
