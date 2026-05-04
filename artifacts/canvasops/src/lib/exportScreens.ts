import { toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import type { View } from '../types';

export interface ExportScreensOptions {
  setCurrentView: (view: View) => void;
  setSelectedProjectId: (id: string | null) => void;
  representativeProjectId: string | null;
  previousView: View;
  previousProjectId: string | null;
  onProgress?: (current: number, total: number, label: string) => void;
}

interface ScreenSpec {
  filename: string;
  label: string;
  view: View;
  projectId?: string | null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function getBackgroundColor(): string {
  const el = document.body;
  const bg = window.getComputedStyle(el).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  return '#ffffff';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportScreens(opts: ExportScreensOptions): Promise<void> {
  const {
    setCurrentView,
    setSelectedProjectId,
    representativeProjectId,
    previousView,
    previousProjectId,
    onProgress,
  } = opts;

  const screens: ScreenSpec[] = [
    { filename: '01-home.jpg', label: 'Home', view: 'home' },
    {
      filename: '02-project.jpg',
      label: 'Project',
      view: 'project',
      projectId: representativeProjectId,
    },
    { filename: '03-workflow.jpg', label: 'Workflow', view: 'work' },
    { filename: '04-stakeholders.jpg', label: 'Stakeholders', view: 'stakeholders' },
    { filename: '05-log.jpg', label: 'Log', view: 'log' },
    { filename: '06-people.jpg', label: 'People', view: 'people' },
  ];

  const zip = new JSZip();
  const bg = getBackgroundColor();

  try {
    for (let i = 0; i < screens.length; i++) {
      const s = screens[i];
      onProgress?.(i + 1, screens.length, s.label);

      if (s.view === 'project') {
        if (s.projectId) setSelectedProjectId(s.projectId);
      }
      setCurrentView(s.view);

      await nextPaint();
      await wait(200);
      await nextPaint();

      const target = document.querySelector('main.main') as HTMLElement | null;
      if (!target) continue;

      const jpegDataUrl = await toJpeg(target, {
        backgroundColor: bg,
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
      });

      // data:image/jpeg;base64,<base64>
      const commaIdx = jpegDataUrl.indexOf(',');
      const base64 = commaIdx >= 0 ? jpegDataUrl.slice(commaIdx + 1) : jpegDataUrl;
      zip.file(s.filename, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'canvasops-screens.zip');
  } finally {
    setSelectedProjectId(previousProjectId);
    setCurrentView(previousView);
  }
}
