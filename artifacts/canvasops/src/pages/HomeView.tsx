import { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Project, Action } from '../types';
import { AddProjectModal } from '../components/forms/AddProjectModal';
import { AddActionModal } from '../components/forms/AddActionModal';

function formatSessionWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

function ProjectCard({ project, teamName, onOpen }: { project: Project; teamName?: string; onOpen: () => void }) {
  return (
    <div
      className="project-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="project-card-head">
        <div className="project-name">{project.name}</div>
        <div className="project-meta">{project.meta}</div>
      </div>
      <div className="project-card-badges">
        <span className={`badge ${project.stageClass}`}>{project.stage}</span>
        <span className={`badge ${project.statusClass}`}>{project.status}</span>
        {teamName && <span className="badge team-badge">{teamName}</span>}
      </div>
      <div className="project-card-open">Open →</div>
    </div>
  );
}

function ActionRow({
  action,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  action: Action;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onToggleComplete: (next: boolean) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isDone = !!action.completedAt;

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggleComplete(!isDone);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className={`list-item action-row${isDone ? ' action-row-done' : ''}`}>
      <input
        type="checkbox"
        className="action-row-checkbox"
        checked={isDone}
        disabled={toggling}
        onChange={handleToggle}
        aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
      />
      <div className="action-row-text">
        <div className="item-title">{action.title}</div>
        {action.note && <div className="item-sub">{action.note}</div>}
      </div>
      <div className="action-row-controls">
        {confirming ? (
          <>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-icon danger"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-icon" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className="btn btn-icon danger-text"
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function HomeView() {
  const {
    projects,
    teams,
    openProject,
    setProjectModalOpen,
    actions,
    deleteAction,
    updateAction,
    upcomingSessions,
    loadUpcomingSessions,
  } = useAppContext();
  const teamById = new Map(teams.map(t => [t.id, t]));

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const openAddAction = () => {
    setEditingAction(null);
    setActionModalOpen(true);
  };

  const openEditAction = (action: Action) => {
    setEditingAction(action);
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    setActionModalOpen(false);
    setEditingAction(null);
  };

  useEffect(() => {
    void loadUpcomingSessions();
  }, [loadUpcomingSessions]);

  const pendingCount = actions.filter((a) => !a.completedAt).length;
  const doneCount = actions.filter((a) => !!a.completedAt).length;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Projects at a glance</h1>
          <p className="sub flush">Open a project to navigate across its workflow, evidence, stakeholders, resources, and activity log.</p>
        </div>
        <button className="btn primary" onClick={() => setProjectModalOpen(true)}>+ Add project</button>
      </div>

      <div className="card pad">
        {projects.length === 0 ? (
          <div className="project-strip-empty">
            <h3 className="project-strip-empty-title">No projects yet</h3>
            <p className="project-strip-empty-sub">
              Create a project to start tracking workflow, evidence, and stakeholders.
            </p>
            <button className="btn primary" onClick={() => setProjectModalOpen(true)}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="project-strip">
            {projects.map((p) => {
              const team = p.teamId ? teamById.get(p.teamId) : undefined;
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  teamName={team?.name}
                  onOpen={() => openProject(p.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div
            className="list-item list-item-clickable"
            role="button"
            tabIndex={0}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActionsOpen((o) => !o);
              }
            }}
          >
            <div className="section-title flush">My tasks</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'auto' }}>
              {pendingCount > 0 && (
                <span className="badge disc" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {pendingCount} pending
                </span>
              )}
              {doneCount > 0 && (
                <span className="badge good" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {doneCount} done
                </span>
              )}
              {pendingCount === 0 && doneCount === 0 && (
                <span className="item-sub" style={{ margin: 0 }}>Nothing yet</span>
              )}
              <span
                className="muted"
                style={{
                  fontSize: '16px',
                  lineHeight: 1,
                  transform: actionsOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--transition)',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              >
                ⌄
              </span>
            </div>
          </div>

          {actionsOpen && (
            <>
              {actions.length === 0 ? (
                <div className="list-item action-empty">
                  <div className="item-title">Nothing on your plate yet</div>
                  <div className="item-sub">
                    Capture the things you want to get to today. Only you can see your list.
                  </div>
                </div>
              ) : (
                <>
                  {actions
                    .filter((a) => !a.completedAt)
                    .map((action) => (
                      <ActionRow
                        key={action.id}
                        action={action}
                        onEdit={() => openEditAction(action)}
                        onDelete={() => deleteAction(action.id)}
                        onToggleComplete={(next) =>
                          updateAction(action.id, {
                            completedAt: next ? new Date().toISOString() : null,
                          })
                        }
                      />
                    ))}
                  {actions.some((a) => a.completedAt) && (
                    <>
                      <div className="list-item action-done-head">
                        <div className="item-sub">Done today</div>
                      </div>
                      {actions
                        .filter((a) => a.completedAt)
                        .map((action) => (
                          <ActionRow
                            key={action.id}
                            action={action}
                            onEdit={() => openEditAction(action)}
                            onDelete={() => deleteAction(action.id)}
                            onToggleComplete={(next) =>
                              updateAction(action.id, {
                                completedAt: next ? new Date().toISOString() : null,
                              })
                            }
                          />
                        ))}
                    </>
                  )}
                </>
              )}
              <div className="list-item">
                <button type="button" className="btn btn-icon" onClick={openAddAction}>
                  + Add action
                </button>
              </div>
            </>
          )}
        </div>

        <div className="stack">
          <div className="card pad">
            <div className="section-title tight">Quick stats</div>
            <div className="kpi">
              <div className="card pad">
                <div className="muted">Active projects</div>
                <strong>12</strong>
              </div>
              <div className="card pad">
                <div className="muted">Awaiting review</div>
                <strong>4</strong>
              </div>
              <div className="card pad">
                <div className="muted">Stakeholders</div>
                <strong>26</strong>
              </div>
              <div className="card pad">
                <div className="muted">Open log items</div>
                <strong>18</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="list-item">
          <div className="section-title flush">Upcoming sessions</div>
        </div>
        {upcomingSessions.length === 0 ? (
          <div className="list-item">
            <div className="item-sub">
              No upcoming sessions yet. Open a project to schedule one.
            </div>
          </div>
        ) : (
          upcomingSessions.map((s) => {
            const sub = [
              formatSessionWhen(s.scheduledAt),
              s.attendees,
              s.notes,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <div
                key={s.id}
                className="list-item list-item-clickable"
                role="button"
                tabIndex={0}
                onClick={() => openProject(s.projectId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openProject(s.projectId);
                  }
                }}
              >
                <div className="item-title">
                  {s.title} — {s.projectName}
                </div>
                <div className="item-sub">{sub}</div>
              </div>
            );
          })
        )}
      </div>

      <AddProjectModal />
      <AddActionModal
        isOpen={actionModalOpen}
        onClose={closeActionModal}
        editing={editingAction}
      />
    </section>
  );
}
