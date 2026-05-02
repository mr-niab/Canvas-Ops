import { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Project, Action } from '../types';
import { AddProjectModal } from '../components/forms/AddProjectModal';
import { AddActionModal } from '../components/forms/AddActionModal';

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
}: {
  action: Action;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="list-item action-row">
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
  } = useAppContext();
  const teamById = new Map(teams.map(t => [t.id, t]));

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

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
          <div className="list-item action-head">
            <div className="section-title flush">My actions today</div>
            <button type="button" className="btn btn-icon" onClick={openAddAction}>
              + Add action
            </button>
          </div>
          {actions.length === 0 ? (
            <div className="list-item action-empty">
              <div className="item-title">Nothing on your plate yet</div>
              <div className="item-sub">
                Capture the things you want to get to today. Only you can see your list.
              </div>
            </div>
          ) : (
            actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onEdit={() => openEditAction(action)}
                onDelete={() => deleteAction(action.id)}
              />
            ))
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

      <div className="low-section card">
        <div className="list-item">
          <div className="section-title flush">Upcoming sessions</div>
        </div>
        <div className="list-item">
          <div className="item-title">Design crit — Appointment Booking</div>
          <div className="item-sub">Mon 2:00pm · UX/UI team · Booking confirmation + error flows</div>
        </div>
        <div className="list-item">
          <div className="item-title">Research debrief — Staff Portal v2</div>
          <div className="item-sub">Tue 10:00am · Research + UX/UI · Round 2 synthesis</div>
        </div>
        <div className="list-item">
          <div className="item-title">Stakeholder playback — Appointment Booking</div>
          <div className="item-sub">Wed 3:00pm · Project team + stakeholders · Service findings</div>
        </div>
        <div className="list-item">
          <div className="item-title">Stage gate review — Appointment Booking</div>
          <div className="item-sub">Thu 2:00pm · All disciplines · Beta → Live readiness</div>
        </div>
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
