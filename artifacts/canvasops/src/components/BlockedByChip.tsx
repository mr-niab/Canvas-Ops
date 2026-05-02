import { Task } from '../types';
import { unmetDependencies } from '../lib/dependencies';

interface BlockedByChipProps {
  task: Task;
  allTasks: Task[];
}

export function BlockedByChip({ task, allTasks }: BlockedByChipProps) {
  const unmet = unmetDependencies(task, allTasks);
  if (unmet.length === 0) return null;
  const titleAttr = `Blocked by: ${unmet.map(t => t.title).join(', ')}`;
  return (
    <span className="chip chip-blocked" title={titleAttr} aria-label={titleAttr}>
      Blocked by {unmet.length}
    </span>
  );
}
