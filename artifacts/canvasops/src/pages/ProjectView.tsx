import { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Discipline, Task } from '../types';
import { AddTaskModal } from '../components/forms/AddTaskModal';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';
import { AddLogEntryModal } from '../components/forms/AddLogEntryModal';
import { StakeholdersTable } from '../components/StakeholdersTable';
import { LogList } from '../components/LogList';

type Tab = 'overview' | 'workflow' | 'evidence' | 'stakeholders' | 'resources' | 'log';

const STAGES: Array<'Intake' | 'Discovery' | 'Alpha' | 'Beta' | 'Live'> = [
  'Intake', 'Discovery', 'Alpha', 'Beta', 'Live'
];

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

export function ProjectView() {
  const { setCurrentView, tasks, setTaskModalOpen, setStakeholderModalOpen, setLogModalOpen } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const project = {
    name: 'Appointment Booking Redesign',
    sub: 'NHS · Lead Jamie D. · Next session Tue 2pm',
    currentStage: 'Beta' as const,
  };
  const currentIdx = STAGES.indexOf(project.currentStage);

  return (
    <section>
      <div className="page-head">
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, cursor: 'pointer' }} onClick={() => setCurrentView('home')}>← All projects</div>
          <h1>{project.name}</h1>
          <p className="sub" style={{ marginBottom: 0 }}>{project.sub}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge beta">Beta</span>
          <span className="badge good">On track</span>
          <button className="btn primary" onClick={() => setTaskModalOpen(true)}>+ Add task</button>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Project stage</div>
        <div className="stage-track">
          {STAGES.map((s, i) => {
            let cls = '';
            if (i < currentIdx) cls = 'done';
            else if (i === currentIdx) cls = 'active';
            return <div key={s} className={`stage ${cls}`}>{s}</div>;
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Stage gates require: research evidence linked · service blueprint updated · UI validated · decisions logged</div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>Workflow</button>
        <button className={`tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>Evidence</button>
        <button className={`tab ${activeTab === 'stakeholders' ? 'active' : ''}`} onClick={() => setActiveTab('stakeholders')}>Stakeholders</button>
        <button className={`tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Resources</button>
        <button className={`tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Log</button>
      </div>

      {activeTab === 'overview' && (
        <div className="project-layout">
          <div className="stack">
            <div className="card pad">
              <div className="section-title">Cross-discipline workflow</div>
              <div className="lane-wrap">
                {DISCIPLINES.map(d => (
                  <Lane key={d.key} discipline={d.key} label={d.label} color={d.color} tasks={tasks} />
                ))}
              </div>
            </div>

            <div className="card">
              <div className="list-item">
                <div className="section-title" style={{ margin: 0 }}>Upcoming sessions</div>
              </div>
              <div className="list-item">
                <div className="item-title">Design crit</div>
                <div className="item-sub">Mon 2:00pm · Booking confirmation + error flows</div>
              </div>
              <div className="list-item">
                <div className="item-title">Stakeholder playback</div>
                <div className="item-sub">Wed 3:00pm · Service findings with project stakeholders</div>
              </div>
              <div className="list-item">
                <div className="item-title">Stage gate review — Beta</div>
                <div className="item-sub">Thu 2:00pm · All disciplines · Beta → Live readiness</div>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card pad">
              <div className="section-title">Project health</div>
              <div className="health-block">
                <div className="health-label">Research evidence</div>
                <div className="mini"><span className="done"></span><span className="done"></span><span className="done"></span><span className="done"></span><span></span></div>
              </div>
              <div className="health-block">
                <div className="health-label">UI validated</div>
                <div className="mini"><span className="done"></span><span className="done"></span><span className="done"></span><span className="active"></span><span></span></div>
              </div>
              <div className="health-block">
                <div className="health-label">Stakeholders aligned</div>
                <div className="mini"><span className="done"></span><span className="done"></span><span className="active"></span><span></span><span></span></div>
              </div>
              <div className="health-block" style={{ marginBottom: 0 }}>
                <div className="health-label">Decisions logged</div>
                <div className="mini"><span className="done"></span><span className="done"></span><span className="active"></span><span></span><span></span></div>
              </div>
            </div>

            <div className="card pad">
              <div className="section-title">Stakeholders</div>
              <div style={{ marginBottom: 10 }}>
                <div className="item-title">5 recorded</div>
                <div className="item-sub">Project sponsor, service owner, operations lead, IT lead, research representative</div>
              </div>
              <button className="btn" onClick={() => setActiveTab('stakeholders')}>Open stakeholders →</button>
            </div>

            <div className="card pad">
              <div className="section-title">Recent log</div>
              <div style={{ marginBottom: 12 }}>
                <div className="item-title">Stakeholder call notes added</div>
                <div className="item-sub">Today · Jamie D. · Conversation</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="item-title">Service blueprint v3 uploaded</div>
                <div className="item-sub">Yesterday · Tom K. · File</div>
              </div>
              <div>
                <div className="item-title">Stage note updated</div>
                <div className="item-sub">30 Apr · Anika P. · Decision</div>
              </div>
              <div className="divider"></div>
              <button className="btn" onClick={() => setActiveTab('log')}>Open full log →</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="card pad">
          <div className="lane-wrap">
            {DISCIPLINES.map(d => (
              <Lane key={d.key} discipline={d.key} label={d.label} color={d.color} tasks={tasks} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="card pad">
          <div className="section-title">Evidence</div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Coming soon — research artefacts, interview clips, and synthesis boards will live here.</p>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="card pad">
          <div className="section-title">Resources</div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Coming soon — design files, blueprints, and shared documents will live here.</p>
        </div>
      )}

      {activeTab === 'stakeholders' && (
        <div className="card pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 4 }}>Stakeholders</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>People connected to this project — recorded with role, email, last contact, and alignment status.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setCurrentView('stakeholders')}>Open full page →</button>
              <button className="btn primary" onClick={() => setStakeholderModalOpen(true)}>+ Add stakeholder</button>
            </div>
          </div>
          <StakeholdersTable />
        </div>
      )}

      {activeTab === 'log' && (
        <div className="card pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 4 }}>Project log</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chronological record of conversations, decisions, files, and key activity for this project.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setCurrentView('log')}>Open full page →</button>
              <button className="btn primary" onClick={() => setLogModalOpen(true)}>+ Add log entry</button>
            </div>
          </div>
          <LogList />
        </div>
      )}

      <AddTaskModal />
      <AddStakeholderModal />
      <AddLogEntryModal />
    </section>
  );
}
