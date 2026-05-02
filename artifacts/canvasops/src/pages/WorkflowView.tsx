import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../AppContext';
import { Discipline, Task } from '../types';
import { AddTaskModal } from '../components/forms/AddTaskModal';

const DISCIPLINES: Array<{ key: Discipline; label: string; color: string }> = [
  { key: 'UX/UI Design', label: 'UX / UI Design', color: 'var(--primary)' },
  { key: 'User Research', label: 'User Research', color: 'var(--research)' },
  { key: 'Service Design', label: 'Service Design', color: 'var(--service)' },
];

function TaskCardPresentation({ task, isOverlay = false }: { task: Task; isOverlay?: boolean }) {
  return (
    <div className={`task${isOverlay ? ' task-overlay' : ''}`}>
      {task.title}
      <small>{task.status}</small>
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardPresentation task={task} />
    </div>
  );
}

function Lane({
  discipline,
  label,
  color,
  tasks,
}: {
  discipline: Discipline;
  label: string;
  color: string;
  tasks: Task[];
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
            <SortableTaskCard key={t.id} task={t} />
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
  const { tasks, setCurrentView, setTaskModalOpen, moveTask } = useAppContext();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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

  return (
    <section>
      <div className="page-head">
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, cursor: 'pointer' }} onClick={() => setCurrentView('project')}>← Appointment Booking Redesign</div>
          <h1>Workflow</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Cross-discipline kanban — all three disciplines visible in one board.</p>
        </div>
        <button className="btn primary" onClick={() => setTaskModalOpen(true)}>+ Add task</button>
      </div>

      <div className="card pad">
        <DndContext
          sensors={sensors}
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
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardPresentation task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AddTaskModal />
    </section>
  );
}
