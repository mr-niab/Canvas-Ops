import { useEffect, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';
import { Action } from '../../types';

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: Action | null;
}

export function AddActionModal({ isOpen, onClose, editing }: AddActionModalProps) {
  const { addAction, updateAction } = useAppContext();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(editing?.title ?? '');
      setNote(editing?.note ?? '');
      setError(null);
    }
  }, [isOpen, editing]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await updateAction(editing.id, { title, note });
      } else {
        await addAction({ title, note });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={editing ? 'Edit action' : 'Add action'}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">What needs doing?</label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review synthesis report"
            autoFocus
            maxLength={200}
          />
        </div>
        <div>
          <label className="field-label">Context (optional)</label>
          <input
            className="field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Staff Portal v2 · Research · Awaiting your comments"
            maxLength={300}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={!title.trim() || submitting}
          >
            {submitting
              ? editing
                ? 'Saving…'
                : 'Adding…'
              : editing
                ? 'Save changes'
                : 'Add action'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
