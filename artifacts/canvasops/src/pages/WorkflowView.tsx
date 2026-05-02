import { useAppContext } from '../AppContext';
import { Discipline, Task } from '../types';
import { AddTaskModal } from '../components/forms/AddTaskModal';

const DISCIPLINES: Array<{ key: Discipline; label: string; color: string }> = [
  { key: 'UX/UI Design', label: 'UX / UI Design', color: 'var(--primary)' },
  { key: 'User Research', label: 'User Research', color: 'var(--research)' },
  { key: 'Service Design', label: 'Service Design', color: 'var(--service)' },
];

function Lane({ discipline, label, color, tasks }: { discipline: Discipline; label: string; color: string; tasks: Task[] }) {
  const laneTasks = tasks.filter(t => t.discipline === discipline);
  return (
    <div className="lane">
      <div className="lane-head" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}></span>
        {label}
      </div>
      <div className="lane-body">
        {laneTasks.map(t => (
          <div className="task" key={t.id}>
            {t.title}
            <small>{t.status}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkflowView() {
  const { tasks, setCurrentView, setTaskModalOpen } = useAppContext();

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
        <div className="lane-wrap">
          {DISCIPLINES.map(d => (
            <Lane key={d.key} discipline={d.key} label={d.label} color={d.color} tasks={tasks} />
          ))}
        </div>
      </div>

      <AddTaskModal />
    </section>
  );
}
