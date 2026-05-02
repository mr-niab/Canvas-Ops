import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Project, Task, Stakeholder, LogEntry, EvidenceFile, LinkedBoard, ProjectEvidence, Organisation, Team, Teammate, BoardProvider } from './types';
import { initialProjects, initialTasks, initialStakeholders, initialLogEntries, initialOrganisation, initialTeams, initialTeammates } from './data';
import { recomputeBlockedStates } from './lib/dependencies';
import {
  createEvidenceFile as apiCreateEvidenceFile,
  createLinkedBoard as apiCreateLinkedBoard,
  deleteEvidenceFile as apiDeleteEvidenceFile,
  deleteLinkedBoard as apiDeleteLinkedBoard,
  listProjectEvidence as apiListProjectEvidence,
  requestUploadUrl as apiRequestUploadUrl,
} from '@workspace/api-client-react';

const TASKS_STORAGE_KEY = 'canvasops:tasks:v1';
const ORG_STORAGE_KEY = 'canvasops:organisation:v1';
const TEAMS_STORAGE_KEY = 'canvasops:teams:v1';
const TEAMMATES_STORAGE_KEY = 'canvasops:teammates:v1';
const PROJECTS_STORAGE_KEY = 'canvasops:projects:v1';

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
  if (typeof window === 'undefined') return recomputeBlockedStates(initialTasks);
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return recomputeBlockedStates(initialTasks);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return recomputeBlockedStates(initialTasks);
    const valid = parsed.every(
      (t: unknown) =>
        t !== null &&
        typeof t === 'object' &&
        typeof (t as Task).id === 'string' &&
        typeof (t as Task).title === 'string' &&
        typeof (t as Task).status === 'string' &&
        VALID_DISCIPLINES.includes((t as Task).discipline)
    );
    if (!valid) return recomputeBlockedStates(initialTasks);
    const ids = new Set((parsed as Array<{ id: string }>).map(t => t.id));
    const loaded: Task[] = (parsed as Array<Record<string, unknown>>).map(t => {
      const task: Task = {
        id: t.id as string,
        title: t.title as string,
        status: t.status as string,
        discipline: t.discipline as Task['discipline'],
        dependencies: normalizeDependencies(t.dependencies).filter(
          depId => depId !== t.id && ids.has(depId)
        ),
      };
      if (typeof t.previousStatus === 'string') {
        task.previousStatus = t.previousStatus;
      }
      return task;
    });
    return recomputeBlockedStates(loaded);
  } catch {
    return recomputeBlockedStates(initialTasks);
  }
}

function loadFromStorage<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!validate(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string');
}

function isOrganisation(v: unknown): v is Organisation {
  return !!v && typeof v === 'object'
    && typeof (v as Organisation).id === 'string'
    && typeof (v as Organisation).name === 'string';
}

function isTeamArray(v: unknown): v is Team[] {
  return Array.isArray(v) && v.every(t =>
    !!t && typeof t === 'object'
    && typeof (t as Team).id === 'string'
    && typeof (t as Team).name === 'string'
    && typeof (t as Team).description === 'string'
    && isStringArray((t as Team).teammateIds)
  );
}

function isTeammateArray(v: unknown): v is Teammate[] {
  return Array.isArray(v) && v.every(t =>
    !!t && typeof t === 'object'
    && typeof (t as Teammate).id === 'string'
    && typeof (t as Teammate).name === 'string'
    && typeof (t as Teammate).email === 'string'
    && typeof (t as Teammate).role === 'string'
    && isStringArray((t as Teammate).teamIds)
  );
}

function isProjectArray(v: unknown): v is Project[] {
  return Array.isArray(v) && v.every(p =>
    !!p && typeof p === 'object'
    && typeof (p as Project).id === 'string'
    && typeof (p as Project).name === 'string'
  );
}

function reconcileTeamMembership(teams: Team[], teammates: Teammate[]): { teams: Team[]; teammates: Teammate[] } {
  const teamIdSet = new Set(teams.map(t => t.id));
  const mateIdSet = new Set(teammates.map(t => t.id));
  const cleanTeams = teams.map(t => ({
    ...t,
    teammateIds: t.teammateIds.filter(id => mateIdSet.has(id)),
  }));
  const cleanMates = teammates.map(m => ({
    ...m,
    teamIds: m.teamIds.filter(id => teamIdSet.has(id)),
  }));
  const mateById = new Map(cleanMates.map(m => [m.id, { ...m, teamIds: new Set(m.teamIds) }]));
  for (const team of cleanTeams) {
    for (const mateId of team.teammateIds) {
      mateById.get(mateId)?.teamIds.add(team.id);
    }
  }
  const teamById = new Map(cleanTeams.map(t => [t.id, { ...t, teammateIds: new Set(t.teammateIds) }]));
  for (const mate of mateById.values()) {
    for (const teamId of mate.teamIds) {
      teamById.get(teamId)?.teammateIds.add(mate.id);
    }
  }
  return {
    teams: Array.from(teamById.values()).map(t => ({ ...t, teammateIds: Array.from(t.teammateIds) })),
    teammates: Array.from(mateById.values()).map(m => ({ ...m, teamIds: Array.from(m.teamIds) })),
  };
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

function toIso(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : String(date);
}

function normalizeFile(raw: {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  addedBy: string;
  addedAt: Date | string;
  objectPath: string;
  previewUrl?: string;
}): EvidenceFile {
  return {
    id: raw.id,
    projectId: raw.projectId,
    name: raw.name,
    mimeType: raw.mimeType,
    size: raw.size,
    addedBy: raw.addedBy,
    addedAt: toIso(raw.addedAt),
    objectPath: raw.objectPath,
    previewUrl: raw.previewUrl,
  };
}

function normalizeBoard(raw: {
  id: string;
  projectId: string;
  provider: string;
  url: string;
  embedUrl: string;
  title: string;
  linkedBy: string;
  linkedAt: Date | string;
}): LinkedBoard {
  return {
    id: raw.id,
    projectId: raw.projectId,
    provider: raw.provider as BoardProvider,
    url: raw.url,
    embedUrl: raw.embedUrl,
    title: raw.title,
    linkedBy: raw.linkedBy,
    linkedAt: toIso(raw.linkedAt),
  };
}

export type EvidenceState = {
  files: EvidenceFile[];
  boards: LinkedBoard[];
  loading: boolean;
  error: string | null;
};

const EMPTY_EVIDENCE_STATE: EvidenceState = {
  files: [],
  boards: [],
  loading: false,
  error: null,
};

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  organisation: Organisation;
  teams: Team[];
  teammates: Teammate[];
  projects: Project[];
  tasks: Task[];
  stakeholders: Stakeholder[];
  logEntries: LogEntry[];

  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  openProject: (id: string) => void;

  isTaskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  isStakeholderModalOpen: boolean;
  setStakeholderModalOpen: (open: boolean) => void;
  isLogModalOpen: boolean;
  setLogModalOpen: (open: boolean) => void;
  isProjectModalOpen: boolean;
  setProjectModalOpen: (open: boolean) => void;

  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  moveTask: (taskId: string, targetDiscipline: Task['discipline'], targetIndex: number) => void;
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'status' | 'discipline'>>) => void;
  updateTaskDependencies: (taskId: string, dependencies: string[]) => void;
  deleteTask: (taskId: string) => void;
  addStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;

  // Evidence (now async, server-backed) -----------------------------------
  getProjectEvidence: (projectId: string) => EvidenceState;
  loadProjectEvidence: (projectId: string) => Promise<void>;
  uploadEvidenceFile: (
    projectId: string,
    file: File,
    addedBy: string,
  ) => Promise<EvidenceFile>;
  removeEvidenceFile: (projectId: string, fileId: string) => Promise<void>;
  addLinkedBoard: (
    projectId: string,
    board: { provider: BoardProvider; url: string; embedUrl: string; title: string; linkedBy: string },
  ) => Promise<LinkedBoard>;
  removeLinkedBoard: (projectId: string, boardId: string) => Promise<void>;

  // Organisation
  renameOrganisation: (name: string) => void;

  // Teams
  addTeam: (team: { name: string; description?: string }) => void;
  renameTeam: (teamId: string, name: string, description?: string) => void;
  deleteTeam: (teamId: string) => void;

  // Teammates
  addTeammate: (mate: { name: string; email?: string; role?: string; teamIds?: string[] }) => void;
  updateTeammate: (teammateId: string, updates: Partial<Pick<Teammate, 'name' | 'email' | 'role'>>) => void;
  deleteTeammate: (teammateId: string) => void;

  // Membership
  addTeammateToTeam: (teamId: string, teammateId: string) => void;
  removeTeammateFromTeam: (teamId: string, teammateId: string) => void;

  // Projects
  addProject: (project: { name: string; meta?: string; stage?: Project['stage']; teamId?: string }) => string;

  // Project ↔ Team
  setProjectTeam: (projectId: string, teamId: string | undefined) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Unexpected error';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('home');

  const [organisation, setOrganisation] = useState<Organisation>(() =>
    loadFromStorage(ORG_STORAGE_KEY, initialOrganisation, isOrganisation)
  );

  const initialReconciled = (() => {
    const loadedTeams = loadFromStorage(TEAMS_STORAGE_KEY, initialTeams, isTeamArray);
    const loadedMates = loadFromStorage(TEAMMATES_STORAGE_KEY, initialTeammates, isTeammateArray);
    return reconcileTeamMembership(loadedTeams, loadedMates);
  })();
  const [teams, setTeams] = useState<Team[]>(initialReconciled.teams);
  const [teammates, setTeammates] = useState<Teammate[]>(initialReconciled.teammates);

  const [projects, setProjects] = useState<Project[]>(() =>
    loadFromStorage(PROJECTS_STORAGE_KEY, initialProjects, isProjectArray)
  );
  const [tasks, setTasks] = useState<Task[]>(loadPersistedTasks);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(initialLogEntries);

  const [evidenceByProject, setEvidenceByProject] = useState<
    Record<string, EvidenceState>
  >({});
  const evidenceLoadingRef = useRef<Record<string, Promise<void>>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks)); } catch { /* noop */ }
  }, [tasks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(organisation)); } catch { /* noop */ }
  }, [organisation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams)); } catch { /* noop */ }
  }, [teams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(TEAMMATES_STORAGE_KEY, JSON.stringify(teammates)); } catch { /* noop */ }
  }, [teammates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects)); } catch { /* noop */ }
  }, [projects]);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isStakeholderModalOpen, setStakeholderModalOpen] = useState(false);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => projects[0]?.id ?? null
  );

  const openProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('project');
  };

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev =>
      recomputeBlockedStates([
        ...prev,
        { ...task, id: `t${Date.now()}`, dependencies: task.dependencies ?? [] },
      ])
    );
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

  const updateTask = (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'status' | 'discipline'>>
  ) => {
    setTasks(prev =>
      recomputeBlockedStates(
        prev.map(t => {
          if (t.id !== taskId) return t;
          const next = { ...t };
          if (updates.title !== undefined) {
            const trimmed = updates.title.trim();
            if (trimmed) next.title = trimmed;
          }
          if (updates.status !== undefined) {
            const trimmed = updates.status.trim();
            if (trimmed) next.status = trimmed;
          }
          if (updates.discipline !== undefined && VALID_DISCIPLINES.includes(updates.discipline)) {
            next.discipline = updates.discipline;
          }
          return next;
        })
      )
    );
  };

  const updateTaskDependencies = (taskId: string, dependencies: string[]) => {
    setTasks(prev =>
      recomputeBlockedStates(
        prev.map(t => (t.id === taskId ? { ...t, dependencies: [...dependencies] } : t))
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev =>
      recomputeBlockedStates(
        prev
          .filter(t => t.id !== taskId)
          .map(t =>
            t.dependencies && t.dependencies.includes(taskId)
              ? { ...t, dependencies: t.dependencies.filter(id => id !== taskId) }
              : t
          )
      )
    );
    setEditingTaskId(null);
  };

  const addStakeholder = (stakeholder: Omit<Stakeholder, 'id'>) => {
    setStakeholders(prev => [...prev, { ...stakeholder, id: `s${Date.now()}` }]);
  };

  const addLogEntry = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogEntries(prev => [{ ...entry, id: uid('l') }, ...prev]);
  }, []);

  // Evidence -----------------------------------------------------------------

  const getProjectEvidence = useCallback(
    (projectId: string): EvidenceState =>
      evidenceByProject[projectId] ?? EMPTY_EVIDENCE_STATE,
    [evidenceByProject],
  );

  const setEvidenceFor = useCallback(
    (projectId: string, updater: (prev: EvidenceState) => EvidenceState) => {
      setEvidenceByProject(prev => ({
        ...prev,
        [projectId]: updater(prev[projectId] ?? EMPTY_EVIDENCE_STATE),
      }));
    },
    [],
  );

  const loadProjectEvidence = useCallback(
    async (projectId: string): Promise<void> => {
      const inFlight = evidenceLoadingRef.current[projectId];
      if (inFlight) return inFlight;

      const promise = (async () => {
        setEvidenceFor(projectId, prev => ({ ...prev, loading: true, error: null }));
        try {
          const data = await apiListProjectEvidence(projectId);
          const files = data.files.map(normalizeFile);
          const boards = data.boards.map(normalizeBoard);
          setEvidenceFor(projectId, () => ({
            files,
            boards,
            loading: false,
            error: null,
          }));
        } catch (err) {
          setEvidenceFor(projectId, prev => ({
            ...prev,
            loading: false,
            error: describeError(err),
          }));
        } finally {
          delete evidenceLoadingRef.current[projectId];
        }
      })();

      evidenceLoadingRef.current[projectId] = promise;
      return promise;
    },
    [setEvidenceFor],
  );

  const uploadEvidenceFile = useCallback(
    async (projectId: string, file: File, addedBy: string): Promise<EvidenceFile> => {
      const contentType = file.type || 'application/octet-stream';

      const presigned = await apiRequestUploadUrl({
        name: file.name,
        size: file.size,
        contentType,
      });

      const putResp = await fetch(presigned.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!putResp.ok) {
        throw new Error(
          `Upload failed (${putResp.status} ${putResp.statusText || 'error'})`,
        );
      }

      const created = await apiCreateEvidenceFile(projectId, {
        name: file.name,
        mimeType: contentType,
        size: file.size,
        addedBy,
        objectPath: presigned.objectPath,
      });
      const persisted = normalizeFile(created);

      setEvidenceFor(projectId, prev => ({
        ...prev,
        files: [persisted, ...prev.files.filter(f => f.id !== persisted.id)],
      }));

      addLogEntry({
        date: formatDateTime(new Date()),
        actor: addedBy,
        type: 'File',
        typeClass: 'beta',
        detail: `Added file "${persisted.name}" to Evidence.`,
      });

      return persisted;
    },
    [addLogEntry, setEvidenceFor],
  );

  const removeEvidenceFile = useCallback(
    async (projectId: string, fileId: string): Promise<void> => {
      const current = evidenceByProject[projectId];
      const existing = current?.files.find(f => f.id === fileId);

      // Optimistically remove so the UI feels snappy; restore on failure.
      setEvidenceFor(projectId, prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId),
      }));

      try {
        await apiDeleteEvidenceFile(projectId, fileId);
      } catch (err) {
        if (existing) {
          setEvidenceFor(projectId, prev => ({
            ...prev,
            files: [existing, ...prev.files.filter(f => f.id !== existing.id)],
          }));
        }
        throw err;
      }

      if (existing) {
        addLogEntry({
          date: formatDateTime(new Date()),
          actor: existing.addedBy,
          type: 'File',
          typeClass: 'beta',
          detail: `Removed file "${existing.name}" from Evidence.`,
        });
      }
    },
    [addLogEntry, evidenceByProject, setEvidenceFor],
  );

  const addLinkedBoard = useCallback(
    async (
      projectId: string,
      board: { provider: BoardProvider; url: string; embedUrl: string; title: string; linkedBy: string },
    ): Promise<LinkedBoard> => {
      const created = await apiCreateLinkedBoard(projectId, board);
      const persisted = normalizeBoard(created);

      setEvidenceFor(projectId, prev => ({
        ...prev,
        boards: [persisted, ...prev.boards.filter(b => b.id !== persisted.id)],
      }));

      addLogEntry({
        date: formatDateTime(new Date()),
        actor: board.linkedBy,
        type: 'Board',
        typeClass: 'disc',
        detail: `Linked ${board.provider === 'miro' ? 'Miro' : 'FigJam'} board "${persisted.title}" to Evidence.`,
      });

      return persisted;
    },
    [addLogEntry, setEvidenceFor],
  );

  const removeLinkedBoard = useCallback(
    async (projectId: string, boardId: string): Promise<void> => {
      const current = evidenceByProject[projectId];
      const existing = current?.boards.find(b => b.id === boardId);

      setEvidenceFor(projectId, prev => ({
        ...prev,
        boards: prev.boards.filter(b => b.id !== boardId),
      }));

      try {
        await apiDeleteLinkedBoard(projectId, boardId);
      } catch (err) {
        if (existing) {
          setEvidenceFor(projectId, prev => ({
            ...prev,
            boards: [existing, ...prev.boards.filter(b => b.id !== existing.id)],
          }));
        }
        throw err;
      }

      if (existing) {
        addLogEntry({
          date: formatDateTime(new Date()),
          actor: existing.linkedBy,
          type: 'Board',
          typeClass: 'disc',
          detail: `Unlinked ${existing.provider === 'miro' ? 'Miro' : 'FigJam'} board "${existing.title}" from Evidence.`,
        });
      }
    },
    [addLogEntry, evidenceByProject, setEvidenceFor],
  );

  // Organisation -----------------------------------------------------------
  const renameOrganisation = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setOrganisation(prev => ({ ...prev, name: trimmed }));
  };

  // Teams ------------------------------------------------------------------
  const addTeam = ({ name, description = '' }: { name: string; description?: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTeams(prev => [...prev, { id: uid('team'), name: trimmed, description: description.trim(), teammateIds: [] }]);
  };

  const renameTeam = (teamId: string, name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTeams(prev => prev.map(t => t.id === teamId
      ? { ...t, name: trimmed, description: description !== undefined ? description.trim() : t.description }
      : t
    ));
  };

  const deleteTeam = (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setTeammates(prev => prev.map(m => ({ ...m, teamIds: m.teamIds.filter(id => id !== teamId) })));
    setProjects(prev => prev.map(p => p.teamId === teamId ? { ...p, teamId: undefined } : p));
  };

  // Teammates --------------------------------------------------------------
  const addTeammate = ({ name, email = '', role = '', teamIds = [] }: { name: string; email?: string; role?: string; teamIds?: string[] }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newId = uid('tm');
    const cleanTeamIds = Array.from(new Set(teamIds));
    setTeammates(prev => [...prev, {
      id: newId,
      name: trimmed,
      email: email.trim(),
      role: role.trim(),
      teamIds: cleanTeamIds,
    }]);
    if (cleanTeamIds.length > 0) {
      setTeams(prev => prev.map(t => cleanTeamIds.includes(t.id) && !t.teammateIds.includes(newId)
        ? { ...t, teammateIds: [...t.teammateIds, newId] }
        : t
      ));
    }
  };

  const updateTeammate = (teammateId: string, updates: Partial<Pick<Teammate, 'name' | 'email' | 'role'>>) => {
    setTeammates(prev => prev.map(m => {
      if (m.id !== teammateId) return m;
      const next = { ...m };
      if (updates.name !== undefined) {
        const trimmed = updates.name.trim();
        if (trimmed) next.name = trimmed;
      }
      if (updates.email !== undefined) next.email = updates.email.trim();
      if (updates.role !== undefined) next.role = updates.role.trim();
      return next;
    }));
  };

  const deleteTeammate = (teammateId: string) => {
    setTeammates(prev => prev.filter(m => m.id !== teammateId));
    setTeams(prev => prev.map(t => ({ ...t, teammateIds: t.teammateIds.filter(id => id !== teammateId) })));
  };

  const addTeammateToTeam = (teamId: string, teammateId: string) => {
    setTeams(prev => prev.map(t => t.id === teamId && !t.teammateIds.includes(teammateId)
      ? { ...t, teammateIds: [...t.teammateIds, teammateId] }
      : t
    ));
    setTeammates(prev => prev.map(m => m.id === teammateId && !m.teamIds.includes(teamId)
      ? { ...m, teamIds: [...m.teamIds, teamId] }
      : m
    ));
  };

  const removeTeammateFromTeam = (teamId: string, teammateId: string) => {
    setTeams(prev => prev.map(t => t.id === teamId
      ? { ...t, teammateIds: t.teammateIds.filter(id => id !== teammateId) }
      : t
    ));
    setTeammates(prev => prev.map(m => m.id === teammateId
      ? { ...m, teamIds: m.teamIds.filter(id => id !== teamId) }
      : m
    ));
  };

  const setProjectTeam = (projectId: string, teamId: string | undefined) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, teamId } : p));
  };

  const addProject = ({ name, meta = '', stage = 'Intake', teamId }: { name: string; meta?: string; stage?: Project['stage']; teamId?: string }): string => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    const id = uid('p');
    const stageClassMap: Record<Project['stage'], string> = {
      Intake: 'disc',
      Discovery: 'disc',
      Alpha: 'alpha',
      Beta: 'beta',
      Live: 'good',
    };
    const stageProgress: Record<Project['stage'], number> = {
      Intake: 1,
      Discovery: 2,
      Alpha: 3,
      Beta: 4,
      Live: 5,
    };
    const newProject: Project = {
      id,
      name: trimmed,
      meta: meta.trim() || 'New project',
      stage,
      stageClass: stageClassMap[stage],
      status: stage === 'Live' ? 'Shipped' : 'On track',
      statusClass: 'good',
      progress: stageProgress[stage],
      totalProgress: 5,
      teamId,
    };
    setProjects(prev => [...prev, newProject]);
    return id;
  };

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView,
      organisation, teams, teammates,
      projects, tasks, stakeholders, logEntries,
      selectedProjectId, setSelectedProjectId, openProject,
      isTaskModalOpen, setTaskModalOpen,
      isStakeholderModalOpen, setStakeholderModalOpen,
      isLogModalOpen, setLogModalOpen,
      isProjectModalOpen, setProjectModalOpen,
      editingTaskId, setEditingTaskId,
      addTask, moveTask, updateTask, updateTaskDependencies, deleteTask, addStakeholder, addLogEntry,
      getProjectEvidence, loadProjectEvidence,
      uploadEvidenceFile, removeEvidenceFile,
      addLinkedBoard, removeLinkedBoard,
      renameOrganisation,
      addTeam, renameTeam, deleteTeam,
      addTeammate, updateTeammate, deleteTeammate,
      addTeammateToTeam, removeTeammateFromTeam,
      addProject, setProjectTeam,
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

// Re-export the public ProjectEvidence shape for callers that consume the
// in-memory snapshot (cards, badges, etc).
export type { ProjectEvidence };
