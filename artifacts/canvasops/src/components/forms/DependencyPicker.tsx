import { useMemo } from 'react';
import { Task } from '../../types';
import { groupTasksByDiscipline } from '../../lib/dependencies';

interface DependencyPickerProps {
  /** All tasks in the project. */
  allTasks: Task[];
  /** The id of the task being edited, so it can be excluded from the list. */
  excludeTaskId?: string | null;
  /** Currently selected dependency ids. */
  value: string[];
  /** Called when the selection changes. */
  onChange: (next: string[]) => void;
  /** Optional ids that should be shown but disabled (e.g. would create a cycle). */
  disabledIds?: ReadonlyArray<string>;
  /** Tooltip text shown on disabled items. */
  disabledReason?: string;
}

export function DependencyPicker({
  allTasks,
  excludeTaskId,
  value,
  onChange,
  disabledIds,
  disabledReason,
}: DependencyPickerProps) {
  const selectable = useMemo(
    () => allTasks.filter(t => t.id !== excludeTaskId),
    [allTasks, excludeTaskId]
  );

  const groups = useMemo(() => groupTasksByDiscipline(selectable), [selectable]);
  const disabledSet = useMemo(() => new Set(disabledIds ?? []), [disabledIds]);
  const selectedSet = useMemo(() => new Set(value), [value]);

  if (selectable.length === 0) {
    return <div className="dep-empty">No other workflow items yet to depend on.</div>;
  }

  const toggle = (id: string) => {
    if (disabledSet.has(id)) return;
    if (selectedSet.has(id)) {
      onChange(value.filter(x => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="dep-list" role="group" aria-label="Dependencies">
      {groups.map(group => (
        <div key={group.discipline}>
          <div className="dep-group-label">{group.discipline}</div>
          {group.tasks.map(t => {
            const isDisabled = disabledSet.has(t.id);
            const checked = selectedSet.has(t.id);
            return (
              <label
                key={t.id}
                className={`dep-option${isDisabled ? ' dep-disabled' : ''}`}
                title={isDisabled ? disabledReason : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isDisabled}
                  onChange={() => toggle(t.id)}
                />
                <span>{t.title}</span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
