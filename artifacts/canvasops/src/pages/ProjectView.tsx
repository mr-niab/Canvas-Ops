import { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Discipline, ProjectSession, Task } from '../types';
import { AddTaskModal } from '../components/forms/AddTaskModal';
import { AddStakeholderModal } from '../components/forms/AddStakeholderModal';
import { AddLogEntryModal } from '../components/forms/AddLogEntryModal';
import { TaskDetailModal } from '../components/forms/TaskDetailModal';
import { SessionModal } from '../components/forms/SessionModal';
import { StakeholdersTable } from '../components/StakeholdersTable';
import { LogList } from '../components/LogList';
import { BlockedByChip } from '../components/BlockedByChip';
import { EvidencePanel } from '../components/EvidencePanel';

function formatSessionWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

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
  const { setEditingTaskId } = useAppContext();
  const laneTasks = tasks.filter(t => t.discipline === discipline);
  return (
    <div className="lane">
      <div className="lane-head" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}></span>
        {label}
      </div>
      <div className="lane-body">
        {laneTasks.map(t => (
          <div
            className="task task-clickable"
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditingTaskId(t.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditingTaskId(t.id);
              }
            }}
          >
            {t.title}
            <small>{t.status}</small>
            <div className="task-meta">
              <BlockedByChip task={t} allTasks={tasks} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectView() {
  const {
    setCurrentView,
    tasks,
    projects,
    teams,
    selectedProjectId,
    setProjectTeam,
    setTaskModalOpen,
    setStakeholderModalOpen,
    setLogModalOpen,
    getProjectEvidence,
    sessionsByProject,
    loadProjectSessions,
    deleteProjectSession,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ProjectSession | null>(null);

  const projectId = selectedProjectId ?? projects[0]?.id ?? null;
  useEffect(() => {
    if (projectId) {
      void loadProjectSessions(projectId);
    }
  }, [projectId, loadProjectSessions]);

  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null;

  if (!project) {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="crumb" onClick={() => setCurrentView('home')}>← All projects</div>
            <h1>No project selected</h1>
            <p className="sub flush">Pick a project from Home or create a new one to get started.</p>
          </div>
        </div>
        <AddTaskModal />
        <AddStakeholderModal />
        <AddLogEntryModal />
        <TaskDetailModal />
      </section>
    );
  }

  const currentIdx = STAGES.indexOf(project.stage);
  const evidence = getProjectEvidence(project.id);
  const evidenceCount = evidence.files.length + evidence.boards.length;
  const projectTeam = project.teamId ? teams.find(t => t.id === project.teamId) : undefined;
  const sessions = sessionsByProject[project.id] ?? [];

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="crumb" onClick={() => setCurrentView('home')}>← All projects</div>
          <h1>{project.name}</h1>
          <p className="sub flush">{project.meta}</p>
          <div className="project-team-row">
            <span className="eyebrow project-team-label">Team</span>
            <select
              className="field-input project-team-select"
              value={project.teamId ?? ''}
              onChange={e => setProjectTeam(project.id, e.target.value || undefined)}
              aria-label="Project team"
            >
              <option value="">Unassigned</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {projectTeam && <span className="badge team-badge">{projectTeam.name}</span>}
          </div>
        </div>
        <div className="cluster">
          <span className={`badge ${project.stageClass}`}>{project.stage}</span>
          <span className={`badge ${project.statusClass}`}>{project.status}</span>
          <button className="btn primary" onClick={() => setTaskModalOpen(true)}>+ Add task</button>
        </div>
      </div>

      <div className="card pad">
        <div className="eyebrow">Project stage</div>
        <div className="stage-track">
          {STAGES.map((s, i) => {
            let cls = '';
            if (i < currentIdx) cls = 'done';
            else if (i === currentIdx) cls = 'active';
            return <div key={s} className={`stage ${cls}`}>{s}</div>;
          })}
        </div>
        <div className="caption">Stage gates require: research evidence linked · service blueprint updated · UI validated · decisions logged</div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>Workflow</button>
        <button className={`tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>
          Evidence{evidenceCount > 0 && <span className="tab-count">{evidenceCount}</span>}
        </button>
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
              <div className="list-item list-item-row">
                <div className="section-title flush">Upcoming sessions</div>
                <button
                  className="btn small"
                  onClick={() => {
                    setEditingSession(null);
                    setSessionModalOpen(true);
                  }}
                >
                  + Add session
                </button>
              </div>
              {sessions.length === 0 ? (
                <div className="list-item">
                  <div className="item-sub">
                    No upcoming sessions. Schedule a crit, playback, or review to keep the team aligned.
                  </div>
                </div>
              ) : (
                sessions.map((s) => {
                  const sub = [formatSessionWhen(s.scheduledAt), s.attendees, s.notes]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <div key={s.id} className="list-item list-item-row">
                      <div className="list-item-main">
                        <div className="item-title">{s.title}</div>
                        <div className="item-sub">{sub}</div>
                      </div>
                      <div className="cluster">
                        <button
                          className="btn small"
                          onClick={() => {
                            setEditingSession(s);
                            setSessionModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn small danger"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete session "${s.title}"? This cannot be undone.`,
                              )
                            ) {
                              void deleteProjectSession(project.id, s.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card pad">
              <div className="section-title">Stakeholders</div>
              <div className="stack-tight">
                <div>
                  <div className="item-title">5 recorded</div>
                  <div className="item-sub">Project sponsor, service owner, operations lead, IT lead, research representative</div>
                </div>
                <div>
                  <button className="btn" onClick={() => setActiveTab('stakeholders')}>Open stakeholders →</button>
                </div>
              </div>
            </div>

            <div className="card pad">
              <div className="section-title">Recent log</div>
              <div className="stack-tight">
                <div>
                  <div className="item-title">Stakeholder call notes added</div>
                  <div className="item-sub">Today · Jamie D. · Conversation</div>
                </div>
                <div>
                  <div className="item-title">Service blueprint v3 uploaded</div>
                  <div className="item-sub">Yesterday · Tom K. · File</div>
                </div>
                <div>
                  <div className="item-title">Stage note updated</div>
                  <div className="item-sub">30 Apr · Anika P. · Decision</div>
                </div>
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
        <EvidencePanel projectId={project.id} />
      )}

      {activeTab === 'resources' && (
        <div className="card pad">
          <div className="section-title">Resources</div>
          <p className="muted-meta">Coming soon — design files, blueprints, and shared documents will live here.</p>
        </div>
      )}

      {activeTab === 'stakeholders' && (
        <div className="card pad">
          <div className="toolbar">
            <div>
              <div className="section-title tight">Stakeholders</div>
              <div className="muted-meta">People connected to this project — recorded with role, email, last contact, and alignment status.</div>
            </div>
            <div className="cluster-sm">
              <button className="btn" onClick={() => setCurrentView('stakeholders')}>Open full page →</button>
              <button className="btn primary" onClick={() => setStakeholderModalOpen(true)}>+ Add stakeholder</button>
            </div>
          </div>
          <StakeholdersTable />
        </div>
      )}

      {activeTab === 'log' && (
        <div className="card pad">
          <div className="toolbar">
            <div>
              <div className="section-title tight">Project log</div>
              <div className="muted-meta">Chronological record of conversations, decisions, files, and key activity for this project.</div>
            </div>
            <div className="cluster-sm">
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
      <TaskDetailModal />
      <SessionModal
        isOpen={sessionModalOpen}
        onClose={() => {
          setSessionModalOpen(false);
          setEditingSession(null);
        }}
        projectId={project.id}
        session={editingSession}
      />
    </section>
  );
}
