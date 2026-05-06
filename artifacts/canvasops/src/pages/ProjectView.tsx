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
import { ConfirmDialog } from '../components/ConfirmDialog';

function formatSessionWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

type Tab = 'overview' | 'workflow' | 'evidence' | 'stakeholders' | 'resources' | 'log';

const STAGES: Array<'Intake' | 'Discovery' | 'Explore' | 'Build' | 'Launch'> = [
  'Intake', 'Discovery', 'Explore', 'Build', 'Launch'
];

const DISCIPLINES: Array<{ key: Discipline; label: string; color: string }> = [
  { key: 'UX/UI Design', label: 'UX / UI Design', color: 'var(--primary)' },
  { key: 'User Research', label: 'User Research', color: 'var(--research)' },
  { key: 'Service Design', label: 'Service Design', color: 'var(--service)' },
];

function Lane({ discipline, label, color, tasks }: { discipline: Discipline; label: string; color: string; tasks: Task[] }) {
  const { setEditingTaskId, addTask } = useAppContext();
  const laneTasks = tasks.filter(t => t.discipline === discipline);
  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) {
      setIsAdding(false);
      setDraftTitle('');
      return;
    }
    await addTask({ discipline, title, status: 'Backlog', dependencies: [] });
    setIsAdding(false);
    setDraftTitle('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setDraftTitle('');
  };

  return (
    <div className="lane">
      <div className="lane-head" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }}></span>
        {label}
      </div>

      {isAdding ? (
        <form
          style={{ padding: '8px 12px 0', display: 'grid', gap: 8 }}
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            aria-label="Task title"
            placeholder="Task title"
            autoFocus
            required
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn primary" style={{ padding: '4px 10px', fontSize: 12 }}>Add</button>
            <button type="button" className="btn" onClick={handleCancel} style={{ padding: '4px 10px', fontSize: 12 }}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ padding: '8px 12px 0' }}>
          <button
            type="button"
            aria-label={`Add task to ${label}`}
            onClick={() => setIsAdding(true)}
            style={{
              width: '100%',
              background: 'none',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            + Add
          </button>
        </div>
      )}

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
    stakeholders,
    logEntries,
    advanceProjectStage,
    assignTaskToProject,
    assignLogEntryToProject,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ProjectSession | null>(null);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState(false);

  const projectId = selectedProjectId ?? projects[0]?.id ?? null;
  useEffect(() => {
    if (projectId) {
      void loadProjectSessions(projectId);
    }
  }, [projectId, loadProjectSessions]);

  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0] ?? null;

  const projectTasks = project ? tasks.filter(t => t.projectId === project.id) : [];
  const projectLogEntries = project ? logEntries.filter(e => e.projectId === project.id) : [];
  const unscopedTasks = project ? tasks.filter(t => t.projectId === null || t.projectId === undefined) : [];
  const unscopedLogEntries = project ? logEntries.filter(e => e.projectId === null || e.projectId === undefined) : [];

  if (!project) {
    return (
      <section>
        <div className="page-head">
          <div>
            <button type="button" className="crumb" onClick={() => setCurrentView('home')}>← All projects</button>
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
          <button type="button" className="crumb" onClick={() => setCurrentView('home')}>← All projects</button>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 0 }}>Project stage</div>
          {currentIdx < STAGES.length - 1 && (
            <button
              className="btn primary"
              style={{ fontSize: 13, padding: '5px 14px' }}
              onClick={() => setConfirmAdvanceOpen(true)}
            >
              Advance to {STAGES[currentIdx + 1]} →
            </button>
          )}
        </div>
        <div className="stage-track">
          {STAGES.map((s, i) => {
            let cls = '';
            if (i < currentIdx) cls = 'done';
            else if (i === currentIdx) cls = 'active';
            return <div key={s} className={`stage ${cls}`}>{s}</div>;
          })}
        </div>
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

      {activeTab === 'overview' && (() => {
        const disciplineCounts = DISCIPLINES.map(d => {
          const dt = projectTasks.filter(t => t.discipline === d.key);
          return {
            key: d.key,
            label: d.label,
            color: d.color,
            total: dt.length,
            inProgress: dt.filter(t => t.status === 'In Progress').length,
            blocked: dt.filter(t => t.status === 'Blocked').length,
          };
        });
        const totalTasks = disciplineCounts.reduce((s, d) => s + d.total, 0);

        const projectStakeholders = stakeholders.filter(s => s.projectId === project.id);

        const recentLog = [...projectLogEntries].slice(0, 3);

        return (
          <div className="overview-4col">
            <div className="card pad">
              <div className="section-title">Workflow</div>
              <div className="stack-tight">
                {totalTasks === 0 ? (
                  <div className="item-sub">No tasks yet.</div>
                ) : (
                  disciplineCounts.map(d => d.total > 0 && (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color, flexShrink: 0, display: 'inline-block' }}></span>
                      <span className="item-title" style={{ color: d.color, flex: '1 1 100px' }}>{d.label}</span>
                      <span className="item-sub">{d.total} task{d.total !== 1 ? 's' : ''}</span>
                      {d.blocked > 0 && <span className="badge badge-blocked">{d.blocked} blocked</span>}
                    </div>
                  ))
                )}
              </div>
              <div className="divider"></div>
              <button className="btn" onClick={() => setActiveTab('workflow')}>Go to Workflow →</button>
            </div>

            <div className="card pad">
              <div className="section-title">Stakeholders</div>
              {projectStakeholders.length === 0 ? (
                <div className="item-sub">No stakeholders yet.</div>
              ) : (
                <div className="stack-tight">
                  <div className="item-title">{projectStakeholders.length} recorded</div>
                  <div className="item-sub">
                    {projectStakeholders.map(s => s.role).filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
              <div className="divider"></div>
              <button className="btn" onClick={() => setActiveTab('stakeholders')}>Open stakeholders →</button>
            </div>

            <div className="card pad">
              <div className="section-title">Evidence</div>
              {evidenceCount === 0 ? (
                <div className="item-sub">No evidence yet.</div>
              ) : (
                <div className="stack-tight">
                  <div className="item-sub">
                    {evidence.files.length > 0 && `${evidence.files.length} file${evidence.files.length !== 1 ? 's' : ''}`}
                    {evidence.files.length > 0 && evidence.boards.length > 0 && ' · '}
                    {evidence.boards.length > 0 && `${evidence.boards.length} linked board${evidence.boards.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
              )}
              <div className="divider"></div>
              <button className="btn" onClick={() => setActiveTab('evidence')}>Open Evidence →</button>
            </div>

            <div className="card pad">
              <div className="section-title">Recent log</div>
              {recentLog.length === 0 ? (
                <div className="item-sub">No log entries yet.</div>
              ) : (
                <div className="stack-tight">
                  {recentLog.map(entry => (
                    <div key={entry.id}>
                      <div className="item-title">{entry.detail}</div>
                      <div className="item-sub">{entry.date} · {entry.actor}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="divider"></div>
              <button className="btn" onClick={() => setActiveTab('log')}>Open full log →</button>
            </div>
          </div>
        );
      })()}

      {activeTab === 'workflow' && (
        <div className="stack">
          <div className="card pad">
            <div className="lane-wrap">
              {DISCIPLINES.map(d => (
                <Lane key={d.key} discipline={d.key} label={d.label} color={d.color} tasks={projectTasks} />
              ))}
            </div>
          </div>
          {unscopedTasks.length > 0 && (
            <div className="card pad">
              <div className="section-title tight" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Unlinked tasks</span>
                <span className="badge" style={{ background: 'var(--surface-alt)', color: 'var(--muted)', fontSize: 11 }}>{unscopedTasks.length}</span>
              </div>
              <div className="muted-meta" style={{ marginBottom: 12 }}>These tasks were created before project linking was introduced. Link them to this project to include them in the Workflow view.</div>
              <div className="stack-tight">
                {unscopedTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div className="item-title">{t.title}</div>
                      <div className="item-sub">{t.discipline} · {t.status}</div>
                    </div>
                    <button
                      className="btn small"
                      onClick={() => void assignTaskToProject(t.id, project.id)}
                    >
                      Link to project
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <div className="list-item list-item-row">
              <div className="section-title flush">Sessions</div>
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
                <div className="item-sub">No sessions yet. Schedule a crit, playback, or review to keep the team aligned.</div>
              </div>
            ) : (
              [...sessions]
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map(s => {
                  const sub = [formatSessionWhen(s.scheduledAt), s.attendees, s.notes].filter(Boolean).join(' · ');
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
                          onClick={() => setPendingDeleteSessionId(s.id)}
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
          <StakeholdersTable projectId={project.id} />
        </div>
      )}

      {activeTab === 'log' && (
        <div className="stack">
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
            <LogList projectId={project.id} />
          </div>
          {unscopedLogEntries.length > 0 && (
            <div className="card pad">
              <div className="section-title tight" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Unlinked log entries</span>
                <span className="badge" style={{ background: 'var(--surface-alt)', color: 'var(--muted)', fontSize: 11 }}>{unscopedLogEntries.length}</span>
              </div>
              <div className="muted-meta" style={{ marginBottom: 12 }}>These entries were created before project linking was introduced. Link them to this project to include them in the Log view.</div>
              <div className="stack-tight">
                {unscopedLogEntries.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div className="item-title">{e.detail}</div>
                      <div className="item-sub">{e.date} · {e.actor} · <span className={`badge ${e.typeClass}`}>{e.type}</span></div>
                    </div>
                    <button
                      className="btn small"
                      onClick={() => void assignLogEntryToProject(e.id, project.id)}
                    >
                      Link to project
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      <ConfirmDialog
        isOpen={pendingDeleteSessionId !== null}
        title="Delete session"
        message={`Delete session "${sessions.find(s => s.id === pendingDeleteSessionId)?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete session"
        onConfirm={() => {
          if (pendingDeleteSessionId) {
            void deleteProjectSession(project.id, pendingDeleteSessionId);
          }
        }}
        onClose={() => setPendingDeleteSessionId(null)}
      />
      <ConfirmDialog
        isOpen={confirmAdvanceOpen}
        title="Advance project stage"
        message={`Move "${project.name}" from ${project.stage} to ${STAGES[currentIdx + 1]}? This will update the project stage for everyone on the team.`}
        confirmLabel={`Advance to ${STAGES[currentIdx + 1]}`}
        confirmClassName="btn primary"
        onConfirm={() => {
          void advanceProjectStage(project.id);
        }}
        onClose={() => setConfirmAdvanceOpen(false)}
      />
    </section>
  );
}
