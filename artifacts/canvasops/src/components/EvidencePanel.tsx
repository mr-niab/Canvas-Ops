import { useRef, useState } from 'react';
import { useAppContext } from '../AppContext';
import { EvidenceFile, LinkedBoard } from '../types';
import { detectBoardProvider, PROVIDER_BADGE_CLASS, PROVIDER_LABEL } from '../lib/boards';

const CURRENT_USER = 'Jamie D.';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

function fileGlyph(mimeType: string, name: string): string {
  const t = mimeType.toLowerCase();
  if (t.startsWith('image/')) return '🖼';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  if (t.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return '📄';
  if (t.includes('zip') || t.includes('compressed') || /\.(zip|tar|gz|7z|rar)$/i.test(name)) return '🗜';
  if (t.includes('spreadsheet') || t.includes('excel') || t === 'text/csv' || /\.(xlsx?|csv|numbers)$/i.test(name)) return '📊';
  if (t.includes('presentation') || t.includes('powerpoint') || /\.(pptx?|key)$/i.test(name)) return '📽';
  if (t.includes('word') || t.includes('document') || /\.(docx?|odt|pages)$/i.test(name)) return '📝';
  return '📎';
}

function FilesSection({ projectId, files }: { projectId: string; files: EvidenceFile[] }) {
  const { addEvidenceFile, removeEvidenceFile } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestFiles = (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (arr.length === 0) return;

    const tooBig = arr.find(f => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than 25 MB. Please attach a smaller file.`);
      return;
    }
    setError(null);

    for (const f of arr) {
      let previewUrl: string | undefined;
      try {
        previewUrl = URL.createObjectURL(f);
      } catch {
        previewUrl = undefined;
      }
      addEvidenceFile(projectId, {
        name: f.name,
        mimeType: f.type || 'application/octet-stream',
        size: f.size,
        addedBy: CURRENT_USER,
        previewUrl,
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      ingestFiles(e.dataTransfer.files);
    }
  };

  const onZoneKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <div className="evidence-section-title">Files</div>
      <div
        className={`dropzone${dragOver ? ' dragover' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onZoneKey}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-strong">Drop files here or click to upload</div>
        <div className="dropzone-sub">Interview notes, screenshots, transcripts, briefs · up to 25 MB each</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) ingestFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error && <div className="form-error" style={{ marginTop: 'var(--space-2)' }}>{error}</div>}

      {files.length === 0 ? (
        <div className="evidence-empty" style={{ marginTop: 'var(--space-3)' }}>
          No files yet. Drop research notes, screenshots, or briefs here so the team can find them later.
        </div>
      ) : (
        <div className="evidence-list">
          {files.map(file => (
            <div className="evidence-row" key={file.id}>
              <div className="evidence-icon" aria-hidden>{fileGlyph(file.mimeType, file.name)}</div>
              <div className="evidence-meta">
                <div className="item-title" title={file.name}>{file.name}</div>
                <div className="item-sub">
                  {formatBytes(file.size)} · Added by {file.addedBy} · {formatStamp(file.addedAt)}
                </div>
              </div>
              <div className="board-card-actions">
                {file.previewUrl ? (
                  <a className="btn" href={file.previewUrl} target="_blank" rel="noreferrer noopener">Open</a>
                ) : (
                  <button className="btn" disabled>Open</button>
                )}
                <button className="btn" onClick={() => removeEvidenceFile(projectId, file.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardCard({ projectId, board }: { projectId: string; board: LinkedBoard }) {
  const { removeLinkedBoard } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(board.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard might be blocked — silently ignore.
    }
  };

  return (
    <div className="board-card">
      <div className="board-card-head">
        <span className={`badge ${PROVIDER_BADGE_CLASS[board.provider]}`}>
          {PROVIDER_LABEL[board.provider]}
        </span>
        <div className="board-card-meta">
          <div className="item-title" title={board.title}>{board.title}</div>
          <div className="item-sub">
            Linked by {board.linkedBy} · {formatStamp(board.linkedAt)}
          </div>
        </div>
        <div className="board-card-actions">
          <button className="btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <a className="btn" href={board.url} target="_blank" rel="noreferrer noopener">Open</a>
          <button className="btn" onClick={onCopy}>{copied ? 'Copied' : 'Copy link'}</button>
          <button className="btn" onClick={() => removeLinkedBoard(projectId, board.id)}>Remove</button>
        </div>
      </div>
      {expanded && (
        <>
          <iframe
            className="board-embed"
            src={board.embedUrl}
            title={board.title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            allow="fullscreen; clipboard-read; clipboard-write"
            loading="lazy"
          />
          <div className="board-embed-fallback">
            If the board doesn't load it may be private — <a href={board.url} target="_blank" rel="noreferrer noopener">open it in a new tab</a> instead.
          </div>
        </>
      )}
    </div>
  );
}

function BoardsSection({ projectId, boards }: { projectId: string; boards: LinkedBoard[] }) {
  const { addLinkedBoard } = useAppContext();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Paste a Miro or FigJam share link to add it here.');
      return;
    }
    if (boards.some(b => b.url === trimmed)) {
      setError('That board is already linked to this project.');
      return;
    }
    const detection = detectBoardProvider(trimmed);
    if (!detection) {
      setError("That link doesn't look like a Miro or FigJam share URL. Try pasting the public share link.");
      return;
    }
    addLinkedBoard(projectId, {
      provider: detection.provider,
      url: trimmed,
      embedUrl: detection.embedUrl,
      title: detection.title,
      linkedBy: CURRENT_USER,
    });
    setUrl('');
    setError(null);
  };

  return (
    <div>
      <div className="evidence-section-title">Linked boards</div>
      <form className="board-form" onSubmit={onAdd}>
        <input
          className="field-input"
          value={url}
          onChange={e => { setUrl(e.target.value); if (error) setError(null); }}
          placeholder="Paste a Miro or FigJam share URL…"
          aria-label="Board share URL"
        />
        <button type="submit" className="btn primary">Add</button>
      </form>
      {error && <div className="form-error" style={{ marginTop: 'var(--space-2)' }}>{error}</div>}

      {boards.length === 0 ? (
        <div className="evidence-empty" style={{ marginTop: 'var(--space-3)' }}>
          Paste a Miro or FigJam share link above to embed the board here for the team.
        </div>
      ) : (
        <div className="board-list">
          {boards.map(b => (
            <BoardCard key={b.id} projectId={projectId} board={b} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvidencePanel({ projectId }: { projectId: string }) {
  const { getProjectEvidence } = useAppContext();
  const evidence = getProjectEvidence(projectId);

  return (
    <div className="card pad">
      <div className="toolbar">
        <div>
          <div className="section-title tight">Evidence</div>
          <div className="muted-meta">
            Files and linked boards that back up this project's research and decisions.
          </div>
        </div>
        <div className="cluster-sm">
          <span className="tag">{evidence.files.length} files</span>
          <span className="tag">{evidence.boards.length} boards</span>
        </div>
      </div>
      <div className="evidence-stack">
        <FilesSection projectId={projectId} files={evidence.files} />
        <BoardsSection projectId={projectId} boards={evidence.boards} />
      </div>
    </div>
  );
}
