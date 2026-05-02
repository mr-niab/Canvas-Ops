import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Stage } from '../../types';

const STAGES: Stage[] = ['Intake', 'Discovery', 'Alpha', 'Beta', 'Live'];

export function AddProjectModal() {
  const { isProjectModalOpen, setProjectModalOpen, addProject, teams, openProject } = useAppContext();
  const [name, setName] = useState('');
  const [meta, setMeta] = useState('');
  const [stage, setStage] = useState<Stage>('Intake');
  const [teamId, setTeamId] = useState<string>('');

  const reset = () => {
    setName('');
    setMeta('');
    setStage('Intake');
    setTeamId('');
  };

  const close = () => {
    reset();
    setProjectModalOpen(false);
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const id = await addProject({
        name,
        meta,
        stage,
        teamId: teamId || undefined,
      });
      if (id) openProject(id);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isProjectModalOpen} onClose={close} title="Add project">
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">Project name</label>
          <input
            className="field-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Onboarding redesign"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Short description</label>
          <input
            className="field-input"
            value={meta}
            onChange={e => setMeta(e.target.value)}
            placeholder="e.g. Internal tools · UX/UI + Research"
          />
        </div>
        <div>
          <label className="field-label">Stage</label>
          <select className="field-input" value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Team</label>
          <select
            className="field-input"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {teams.length === 0 && (
            <div className="caption" style={{ marginTop: 4 }}>
              No teams yet — add teams from People &amp; Teams to assign one here.
            </div>
          )}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={close} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!name.trim() || submitting}>
            {submitting ? 'Adding…' : 'Add project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
