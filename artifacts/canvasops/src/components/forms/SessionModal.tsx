import { useEffect, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { ProjectSession } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  session?: ProjectSession | null;
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionModal({ isOpen, onClose, projectId, session }: Props) {
  const { addProjectSession, updateProjectSession } = useAppContext();
  const isEdit = Boolean(session);

  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultStart());
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (session) {
      setTitle(session.title);
      setScheduledAt(toLocalInputValue(session.scheduledAt));
      setAttendees(session.attendees);
      setNotes(session.notes);
    } else {
      setTitle('');
      setScheduledAt(defaultStart());
      setAttendees('');
      setNotes('');
    }
    setError(null);
  }, [isOpen, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    const isoScheduledAt = new Date(scheduledAt).toISOString();
    setSubmitting(true);
    setError(null);
    try {
      if (session) {
        await updateProjectSession(projectId, session.id, {
          title: title.trim(),
          scheduledAt: isoScheduledAt,
          attendees: attendees.trim(),
          notes: notes.trim(),
        });
      } else {
        await addProjectSession(projectId, {
          title: title.trim(),
          scheduledAt: isoScheduledAt,
          attendees: attendees.trim(),
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit session' : 'Add session'}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">Title</label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Design crit"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="field-label">When</label>
          <input
            type="datetime-local"
            className="field-input"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Attendees</label>
          <input
            className="field-input"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="All disciplines, stakeholders…"
          />
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            className="field-input field-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agenda, prep, focus area…"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add session'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
