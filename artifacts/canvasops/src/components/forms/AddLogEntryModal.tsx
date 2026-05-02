import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';

const TYPE_OPTIONS: Array<{ label: string; cls: string }> = [
  { label: 'Conversation', cls: 'disc' },
  { label: 'Decision', cls: 'good' },
  { label: 'File', cls: 'beta' },
  { label: 'Email', cls: 'risk' },
  { label: 'Stage', cls: 'good' },
];

function formatNow(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

export function AddLogEntryModal() {
  const { isLogModalOpen, setLogModalOpen, addLogEntry } = useAppContext();
  const [actor, setActor] = useState('Jamie D.');
  const [typeIdx, setTypeIdx] = useState(0);
  const [detail, setDetail] = useState('');

  const reset = () => {
    setActor('Jamie D.');
    setTypeIdx(0);
    setDetail('');
  };

  const close = () => {
    reset();
    setLogModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail.trim()) return;
    const type = TYPE_OPTIONS[typeIdx];
    addLogEntry({
      date: formatNow(),
      actor: actor.trim() || 'Unknown',
      type: type.label,
      typeClass: type.cls,
      detail: detail.trim(),
    });
    close();
  };

  return (
    <Modal isOpen={isLogModalOpen} onClose={close} title="Add log entry">
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label className="field-label">Actor</label>
          <input className="field-input" value={actor} onChange={e => setActor(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="field-label">Type</label>
          <select className="field-input" value={typeIdx} onChange={e => setTypeIdx(Number(e.target.value))}>
            {TYPE_OPTIONS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Detail</label>
          <textarea
            className="field-input field-textarea"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="What happened?"
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add entry</button>
        </div>
      </form>
    </Modal>
  );
}
