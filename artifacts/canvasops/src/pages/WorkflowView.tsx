import { useMemo, useState } from 'react';
import {
  Announcements,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  ScreenReaderInstructions,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../AppContext';
import { Discipline, Task } from '../types';
import { AddTaskModal } from '../components/forms/AddTaskModal';
import { TaskDetailModal } from '../components/forms/TaskDetailModal';
import { BlockedByChip } from '../components/BlockedByChip';

const DISCIPLINES: Array<{ key: Discipline; label: string; color: string }> = [
  { key: 'UX/UI Design', label: 'UX / UI Design', color: 'var(--primary)' },
  { key: 'User Research', label: 'User Research', color: 'var(--research)' },
  { key: 'Service Design', label: 'Service Design', color: 'var(--service)' },
];

function TaskCardPresentation({
  task,
  allTasks,
  isOverlay = false,
  onOpen,
}: {
  task: Task;
  allTasks: Task[];
  isOverlay?: boolean;
  onOpen?: () => void;
}) {
  const hasBadges = task.priority || task.assignee;

  return (
    <div className={`task${isOverlay ? ' task-overlay' : ''}`}>
      <div className="task-row">
        <span className="task-title">{task.title}</span>
        {onOpen && (
          <button
            type="button"
            className="task-open-btn"
            aria-label={`Open ${task.title}`}
            // Stop dnd-kit's pointer/keyboard sensors (attached to the parent
            // `.task-shell`) from grabbing the card when this button is used.
            onPointerDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Open
          </button>
        )}
      </div>
      <small>{task.status}</small>
      {hasBadges && (
        <div className="task-badges">
          {task.priority && (
            <span
              className={`task-priority-badge task-priority-${task.priority.toLowerCase()}`}
              aria-label={`Priority: ${task.priority}`}
            >
              {task.priority}
            </span>
          )}
          {task.assignee && (
            <span className="task-assignee-badge" aria-label={`Assigned to ${task.assignee}`}>
              {task.assignee}
            </span>
          )}
        </div>
      )}
      <div className="task-meta">
        <BlockedByChip task={task} allTasks={allTasks} />
      </div>
    </div>
  );
}

function SortableTaskCard({ task, allTasks }: { task: Task; allTasks: Task[] }) {
  const { setEditingTaskId } = useAppContext();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', discipline: task.discipline },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} className="task-shell" style={style} {...attributes} {...listeners}>
      <TaskCardPresentation
        task={task}
        allTasks={allTasks}
        onOpen={() => setEditingTaskId(task.id)}
      />
    </div>
  );
}

function Lane({
  discipline,
  label,
  color,
  tasks,
  allTasks,
}: {
  discipline: Discipline;
  label: string;
  color: string;
  tasks: Task[];
  allTasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${discipline}`,
    data: { type: 'lane', discipline },
  });

  return (
    <div className={`lane${isOver ? ' lane-active' : ''}`}>
      <div className="lane-head" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}></span>
        {label}
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="lane-body">
          {tasks.map(t => (
            <SortableTaskCard key={t.id} task={t} allTasks={allTasks} />
          ))}
          {tasks.length === 0 && (
            <div className="lane-empty">Drop here</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function WorkflowView() {
  const { tasks, setCurrentView, setTaskModalOpen, moveTask, projects, selectedProjectId } = useAppContext();
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null;
  const crumbLabel = project ? `← ${project.name}` : '← Projects';
  const crumbTarget: 'project' | 'home' = project ? 'project' : 'home';
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByLane = useMemo(() => {
    const grouped: Record<Discipline, Task[]> = {
      'UX/UI Design': [],
      'User Research': [],
      'Service Design': [],
    };
    for (const t of tasks) grouped[t.discipline].push(t);
    return grouped;
  }, [tasks]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) ?? null : null;

  const findContainer = (id: string): Discipline | null => {
    if (id.startsWith('lane:')) return id.slice('lane:'.length) as Discipline;
    const t = tasks.find(x => x.id === id);
    return t ? t.discipline : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const sourceLane = findContainer(activeIdStr);
    const targetLane = findContainer(overIdStr);
    if (!sourceLane || !targetLane) return;

    const targetItems = tasksByLane[targetLane];

    let targetIndex: number;
    if (overIdStr.startsWith('lane:')) {
      targetIndex = targetItems.length;
    } else {
      const overIndex = targetItems.findIndex(t => t.id === overIdStr);
      targetIndex = overIndex === -1 ? targetItems.length : overIndex;
    }

    if (sourceLane === targetLane) {
      const sourceIndex = targetItems.findIndex(t => t.id === activeIdStr);
      if (sourceIndex === targetIndex || sourceIndex === -1) return;
      const reordered = arrayMove(targetItems, sourceIndex, targetIndex);
      const newIndex = reordered.findIndex(t => t.id === activeIdStr);
      moveTask(activeIdStr, targetLane, newIndex);
    } else {
      moveTask(activeIdStr, targetLane, targetIndex);
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const describeTask = (id: string): string => {
    const t = tasks.find(x => x.id === id);
    return t ? `${t.title} (${t.discipline})` : 'task';
  };

  const describeContainer = (id: string | undefined): string => {
    if (!id) return 'no lane';
    const idStr = String(id);
    if (idStr.startsWith('lane:')) return idStr.slice('lane:'.length);
    const t = tasks.find(x => x.id === idStr);
    return t ? t.discipline : 'no lane';
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up task ${describeTask(String(active.id))}. Use the arrow keys to move between lanes and reorder. Press space or enter to drop. Press escape to cancel.`;
    },
    onDragOver({ active, over }) {
      if (!over) {
        return `Task ${describeTask(String(active.id))} is no longer over a lane.`;
      }
      return `Task ${describeTask(String(active.id))} is over ${describeContainer(String(over.id))}.`;
    },
    onDragEnd({ active, over }) {
      if (!over) {
        return `Task ${describeTask(String(active.id))} was dropped outside any lane. The move was cancelled.`;
      }
      return `Task ${describeTask(String(active.id))} was dropped into ${describeContainer(String(over.id))}.`;
    },
    onDragCancel({ active }) {
      return `Moving task ${describeTask(String(active.id))} was cancelled.`;
    },
  };

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable:
      'To pick up a task card, press space or enter. While dragging, use the arrow keys to move the card between lanes or reorder it within a lane. Press space or enter again to drop the card in its new position, or press escape to cancel.',
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="crumb" onClick={() => setCurrentView(crumbTarget)}>{crumbLabel}</div>
          <h1>Workflow</h1>
          <p className="sub flush">Cross-discipline kanban — all three disciplines visible in one board.</p>
        </div>
        <button className="btn primary" onClick={() => setTaskModalOpen(true)}>+ Add task</button>
      </div>

      <div className="card pad">
        <DndContext
          sensors={sensors}
          accessibility={{ announcements, screenReaderInstructions }}
          collisionDetection={(args) => {
            const pointerCollisions = pointerWithin(args);
            if (pointerCollisions.length > 0) return pointerCollisions;
            const intersections = rectIntersection(args);
            if (intersections.length > 0) return intersections;
            return closestCorners(args);
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="lane-wrap">
            {DISCIPLINES.map(d => (
              <Lane
                key={d.key}
                discipline={d.key}
                label={d.label}
                color={d.color}
                tasks={tasksByLane[d.key]}
                allTasks={tasks}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardPresentation task={activeTask} allTasks={tasks} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AddTaskModal />
      <TaskDetailModal />
    </section>
  );
}
