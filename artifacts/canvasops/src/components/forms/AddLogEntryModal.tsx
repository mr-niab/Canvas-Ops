import { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { Modal } from '../Modal';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--muted)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  fontWeight: 700,
};

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
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={labelStyle}>Actor</label>
          <input style={inputStyle} value={actor} onChange={e => setActor(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={typeIdx} onChange={e => setTypeIdx(Number(e.target.value))}>
            {TYPE_OPTIONS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Detail</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.5 }}
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="What happened?"
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="submit" className="btn primary">Add entry</button>
        </div>
      </form>
    </Modal>
  );
}
