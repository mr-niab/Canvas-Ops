import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Project, Task, Stakeholder, LogEntry, EvidenceFile, LinkedBoard, ProjectEvidence } from './types';
import { initialProjects, initialTasks, initialStakeholders, initialLogEntries } from './data';

const TASKS_STORAGE_KEY = 'canvasops:tasks:v1';

const VALID_DISCIPLINES: ReadonlyArray<Task['discipline']> = [
  'UX/UI Design',
  'User Research',
  'Service Design',
];

function normalizeDependencies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

function loadPersistedTasks(): Task[] {
  if (typeof window === 'undefined') return initialTasks;
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return initialTasks;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialTasks;
    const valid = parsed.every(
      (t: unknown) =>
        t !== null &&
        typeof t === 'object' &&
        typeof (t as Task).id === 'string' &&
        typeof (t as Task).title === 'string' &&
        typeof (t as Task).status === 'string' &&
        VALID_DISCIPLINES.includes((t as Task).discipline)
    );
    if (!valid) return initialTasks;
    const ids = new Set((parsed as Array<{ id: string }>).map(t => t.id));
    return (parsed as Array<Record<string, unknown>>).map(t => ({
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      discipline: t.discipline as Task['discipline'],
      // Drop any references to ids that no longer exist so stale data
      // can't render a "Blocked by" chip pointing nowhere.
      dependencies: normalizeDependencies(t.dependencies).filter(
        depId => depId !== t.id && ids.has(depId)
      ),
    }));
  } catch {
    return initialTasks;
  }
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

function uid(prefix: string): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  projects: Project[];
  tasks: Task[];
  stakeholders: Stakeholder[];
  logEntries: LogEntry[];

  isTaskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  isStakeholderModalOpen: boolean;
  setStakeholderModalOpen: (open: boolean) => void;
  isLogModalOpen: boolean;
  setLogModalOpen: (open: boolean) => void;

  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  moveTask: (taskId: string, targetDiscipline: Task['discipline'], targetIndex: number) => void;
  updateTaskDependencies: (taskId: string, dependencies: string[]) => void;
  addStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;

  getProjectEvidence: (projectId: string) => ProjectEvidence;
  addEvidenceFile: (projectId: string, file: Omit<EvidenceFile, 'id' | 'addedAt'>) => void;
  removeEvidenceFile: (projectId: string, fileId: string) => void;
  addLinkedBoard: (projectId: string, board: Omit<LinkedBoard, 'id' | 'linkedAt'>) => void;
  removeLinkedBoard: (projectId: string, boardId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_EVIDENCE: ProjectEvidence = { files: [], boards: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('home');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(loadPersistedTasks);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(initialLogEntries);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Quota exceeded or storage disabled — fail silently; in-memory state still works.
    }
  }, [tasks]);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isStakeholderModalOpen, setStakeholderModalOpen] = useState(false);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [
      ...prev,
      { ...task, id: `t${Date.now()}`, dependencies: task.dependencies ?? [] },
    ]);
  };

  const moveTask = (taskId: string, targetDiscipline: Task['discipline'], targetIndex: number) => {
    setTasks(prev => {
      const moving = prev.find(t => t.id === taskId);
      if (!moving) return prev;

      const without = prev.filter(t => t.id !== taskId);
      const updatedMoving: Task =
        moving.discipline === targetDiscipline ? moving : { ...moving, discipline: targetDiscipline };

      const targetLane = without.filter(t => t.discipline === targetDiscipline);
      const clampedIndex = Math.max(0, Math.min(targetIndex, targetLane.length));
      const newTargetLane = [...targetLane];
      newTargetLane.splice(clampedIndex, 0, updatedMoving);

      const result: Task[] = [];
      let inserted = false;
      for (const t of without) {
        if (t.discipline === targetDiscipline) {
          if (!inserted) {
            result.push(...newTargetLane);
            inserted = true;
          }
          continue;
        }
        result.push(t);
      }
      if (!inserted) result.push(...newTargetLane);
      return result;
    });
  };

  const updateTaskDependencies = (taskId: string, dependencies: string[]) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, dependencies: [...dependencies] } : t))
    );
  };

  const addStakeholder = (stakeholder: Omit<Stakeholder, 'id'>) => {
    setStakeholders(prev => [...prev, { ...stakeholder, id: `s${Date.now()}` }]);
  };

  const addLogEntry = (entry: Omit<LogEntry, 'id'>) => {
    setLogEntries(prev => [{ ...entry, id: uid('l') }, ...prev]);
  };

  const getProjectEvidence = (projectId: string): ProjectEvidence => {
    const project = projects.find(p => p.id === projectId);
    return project?.evidence ?? EMPTY_EVIDENCE;
  };

  const addEvidenceFile = (projectId: string, file: Omit<EvidenceFile, 'id' | 'addedAt'>) => {
    const newFile: EvidenceFile = {
      ...file,
      id: uid('ef'),
      addedAt: new Date().toISOString(),
    };
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, evidence: { ...p.evidence, files: [newFile, ...p.evidence.files] } }
        : p
    ));
    addLogEntry({
      date: formatDateTime(new Date()),
      actor: file.addedBy,
      type: 'File',
      typeClass: 'beta',
      detail: `Added file "${file.name}" to Evidence.`,
    });
  };

  const removeEvidenceFile = (projectId: string, fileId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const removed = project.evidence.files.find(f => f.id === fileId);
    if (!removed) return;

    if (removed.previewUrl) {
      try { URL.revokeObjectURL(removed.previewUrl); } catch { /* noop */ }
    }

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, evidence: { ...p.evidence, files: p.evidence.files.filter(f => f.id !== fileId) } }
        : p
    ));
    addLogEntry({
      date: formatDateTime(new Date()),
      actor: removed.addedBy,
      type: 'File',
      typeClass: 'beta',
      detail: `Removed file "${removed.name}" from Evidence.`,
    });
  };

  const addLinkedBoard = (projectId: string, board: Omit<LinkedBoard, 'id' | 'linkedAt'>) => {
    const newBoard: LinkedBoard = {
      ...board,
      id: uid('lb'),
      linkedAt: new Date().toISOString(),
    };
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, evidence: { ...p.evidence, boards: [newBoard, ...p.evidence.boards] } }
        : p
    ));
    addLogEntry({
      date: formatDateTime(new Date()),
      actor: board.linkedBy,
      type: 'Board',
      typeClass: 'disc',
      detail: `Linked ${board.provider === 'miro' ? 'Miro' : 'FigJam'} board "${board.title}" to Evidence.`,
    });
  };

  const removeLinkedBoard = (projectId: string, boardId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const removed = project.evidence.boards.find(b => b.id === boardId);
    if (!removed) return;

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, evidence: { ...p.evidence, boards: p.evidence.boards.filter(b => b.id !== boardId) } }
        : p
    ));
    addLogEntry({
      date: formatDateTime(new Date()),
      actor: removed.linkedBy,
      type: 'Board',
      typeClass: 'disc',
      detail: `Unlinked ${removed.provider === 'miro' ? 'Miro' : 'FigJam'} board "${removed.title}" from Evidence.`,
    });
  };

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView,
      projects, tasks, stakeholders, logEntries,
      isTaskModalOpen, setTaskModalOpen,
      isStakeholderModalOpen, setStakeholderModalOpen,
      isLogModalOpen, setLogModalOpen,
      editingTaskId, setEditingTaskId,
      addTask, moveTask, updateTaskDependencies, addStakeholder, addLogEntry,
      getProjectEvidence, addEvidenceFile, removeEvidenceFile, addLinkedBoard, removeLinkedBoard,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
