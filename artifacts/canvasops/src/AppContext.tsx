import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Project,
  Task,
  Stakeholder,
  LogEntry,
  EvidenceFile,
  LinkedBoard,
  ProjectEvidence,
  Organisation,
  Team,
  Teammate,
  BoardProvider,
} from './types';
import {
  addTeamMember as apiAddTeamMember,
  createEvidenceFile as apiCreateEvidenceFile,
  createLinkedBoard as apiCreateLinkedBoard,
  createLogEntry as apiCreateLogEntry,
  createProject as apiCreateProject,
  createStakeholder as apiCreateStakeholder,
  createTask as apiCreateTask,
  createTeam as apiCreateTeam,
  createTeammate as apiCreateTeammate,
  deleteEvidenceFile as apiDeleteEvidenceFile,
  deleteLinkedBoard as apiDeleteLinkedBoard,
  deleteProject as apiDeleteProject,
  deleteTask as apiDeleteTask,
  deleteTeam as apiDeleteTeam,
  deleteTeammate as apiDeleteTeammate,
  getOrganisation,
  listLogEntries,
  listProjectEvidence as apiListProjectEvidence,
  listProjects,
  listStakeholders,
  listTasks,
  listTeammates,
  listTeams,
  moveTask as apiMoveTask,
  removeTeamMember as apiRemoveTeamMember,
  requestUploadUrl as apiRequestUploadUrl,
  type CreateProjectRequestStage,
  type CreateTaskRequestDiscipline,
  type MoveTaskRequestDiscipline,
  type UpdateTaskRequestDiscipline,
  updateOrganisation as apiUpdateOrganisation,
  updateProject as apiUpdateProject,
  updateTask as apiUpdateTask,
  updateTeam as apiUpdateTeam,
  updateTeammate as apiUpdateTeammate,
} from '@workspace/api-client-react';

type PlaceholderUser = { id: string; name: string; email: string };

const PLACEHOLDER_USER: PlaceholderUser = {
  id: 'placeholder-user',
  name: 'Test User',
  email: 'test@canvasops.local',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Unexpected error';
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hh}:${mm}`;
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

function normalizeTask(raw: {
  id: string;
  discipline: string;
  title: string;
  status: string;
  dependencies: string[];
  previousStatus?: string | null;
}): Task {
  const t: Task = {
    id: raw.id,
    discipline: raw.discipline as Task['discipline'],
    title: raw.title,
    status: raw.status,
    dependencies: Array.isArray(raw.dependencies) ? [...raw.dependencies] : [],
  };
  if (raw.previousStatus) t.previousStatus = raw.previousStatus;
  return t;
}

function normalizeProject(raw: {
  id: string;
  name: string;
  meta: string;
  stage: string;
  stageClass: string;
  status: string;
  statusClass: string;
  teamId?: string | null;
}): Project {
  return {
    id: raw.id,
    name: raw.name,
    meta: raw.meta,
    stage: raw.stage as Project['stage'],
    stageClass: raw.stageClass,
    status: raw.status,
    statusClass: raw.statusClass,
    teamId: raw.teamId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

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
  // Auth (stubbed for testing; no real login flow) ------------------------
  authUser: PlaceholderUser;

  // Routing ---------------------------------------------------------------
  currentView: View;
  setCurrentView: (view: View) => void;

  // Domain data -----------------------------------------------------------
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

  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  moveTask: (
    taskId: string,
    targetDiscipline: Task['discipline'],
    targetIndex: number,
  ) => Promise<void>;
  updateTask: (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'status' | 'discipline'>>,
  ) => Promise<void>;
  updateTaskDependencies: (taskId: string, dependencies: string[]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => Promise<void>;
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => Promise<void>;

  // Evidence (server-backed) ----------------------------------------------
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
    board: {
      provider: BoardProvider;
      url: string;
      embedUrl: string;
      title: string;
      linkedBy: string;
    },
  ) => Promise<LinkedBoard>;
  removeLinkedBoard: (projectId: string, boardId: string) => Promise<void>;

  // Organisation ----------------------------------------------------------
  renameOrganisation: (name: string) => Promise<void>;

  // Teams -----------------------------------------------------------------
  addTeam: (team: { name: string; description?: string }) => Promise<void>;
  renameTeam: (teamId: string, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;

  // Teammates -------------------------------------------------------------
  addTeammate: (mate: {
    name: string;
    email?: string;
    role?: string;
    teamIds?: string[];
  }) => Promise<void>;
  updateTeammate: (
    teammateId: string,
    updates: Partial<Pick<Teammate, 'name' | 'email' | 'role'>>,
  ) => Promise<void>;
  deleteTeammate: (teammateId: string) => Promise<void>;

  // Membership ------------------------------------------------------------
  addTeammateToTeam: (teamId: string, teammateId: string) => Promise<void>;
  removeTeammateFromTeam: (teamId: string, teammateId: string) => Promise<void>;

  // Projects --------------------------------------------------------------
  addProject: (project: {
    name: string;
    meta?: string;
    stage?: Project['stage'];
    teamId?: string;
  }) => Promise<string>;
  setProjectTeam: (projectId: string, teamId: string | undefined) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_ORG: Organisation = { id: '', name: '' };

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: React.ReactNode }) {
  // -- Routing & UI state -------------------------------------------------
  const [currentView, setCurrentView] = useState<View>('home');
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isStakeholderModalOpen, setStakeholderModalOpen] = useState(false);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // -- Domain data --------------------------------------------------------
  const [organisation, setOrganisation] = useState<Organisation>(EMPTY_ORG);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const [evidenceByProject, setEvidenceByProject] = useState<
    Record<string, EvidenceState>
  >({});
  const evidenceLoadingRef = useRef<Record<string, Promise<void>>>({});

  // -- Initial bootstrap --------------------------------------------------
  // Auth is intentionally disabled for testing: load workspace data on mount.

  const loadAllForUser = useCallback(async () => {
    const [org, teamRows, mateRows, projectRows, taskRows, stakeRows, logRows] =
      await Promise.all([
        getOrganisation(),
        listTeams(),
        listTeammates(),
        listProjects(),
        listTasks(),
        listStakeholders(),
        listLogEntries(),
      ]);
    setOrganisation({ id: org.id, name: org.name });
    setTeams(
      teamRows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        teammateIds: [...t.teammateIds],
      })),
    );
    setTeammates(
      mateRows.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        teamIds: [...m.teamIds],
      })),
    );
    const normalizedProjects = projectRows.map(normalizeProject);
    setProjects(normalizedProjects);
    setTasks(taskRows.map(normalizeTask));
    setStakeholders(stakeRows.map((s) => ({ ...s })));
    setLogEntries(logRows.map((l) => ({ ...l })));
    setSelectedProjectId(normalizedProjects[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadAllForUser().catch((err) => {
      console.error('Failed to load workspace data:', describeError(err));
    });
  }, [loadAllForUser]);

  // -- Project navigation -------------------------------------------------
  const openProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setCurrentView('project');
  }, []);

  // -- Tasks (server returns the full recomputed list) --------------------
  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    const rows = await apiCreateTask({
      discipline: task.discipline as CreateTaskRequestDiscipline,
      title: task.title,
      status: task.status,
      dependencies: task.dependencies ?? [],
    });
    setTasks(rows.map(normalizeTask));
  }, []);

  const moveTask = useCallback(
    async (
      taskId: string,
      targetDiscipline: Task['discipline'],
      targetIndex: number,
    ) => {
      const rows = await apiMoveTask(taskId, {
        discipline: targetDiscipline as MoveTaskRequestDiscipline,
        targetIndex,
      });
      setTasks(rows.map(normalizeTask));
    },
    [],
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<Pick<Task, 'title' | 'status' | 'discipline'>>,
    ) => {
      const rows = await apiUpdateTask(taskId, {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.discipline !== undefined
          ? { discipline: updates.discipline as UpdateTaskRequestDiscipline }
          : {}),
      });
      setTasks(rows.map(normalizeTask));
    },
    [],
  );

  const updateTaskDependencies = useCallback(
    async (taskId: string, dependencies: string[]) => {
      const rows = await apiUpdateTask(taskId, { dependencies });
      setTasks(rows.map(normalizeTask));
    },
    [],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    const rows = await apiDeleteTask(taskId);
    setTasks(rows.map(normalizeTask));
    setEditingTaskId(null);
  }, []);

  // -- Stakeholders -------------------------------------------------------
  const addStakeholder = useCallback(
    async (stakeholder: Omit<Stakeholder, 'id'>) => {
      const created = await apiCreateStakeholder(stakeholder);
      setStakeholders((prev) => [...prev, { ...created }]);
    },
    [],
  );

  // -- Log entries --------------------------------------------------------
  const addLogEntry = useCallback(async (entry: Omit<LogEntry, 'id'>) => {
    const created = await apiCreateLogEntry(entry);
    setLogEntries((prev) => [{ ...created }, ...prev]);
  }, []);

  // -- Evidence -----------------------------------------------------------
  const getProjectEvidence = useCallback(
    (projectId: string): EvidenceState =>
      evidenceByProject[projectId] ?? EMPTY_EVIDENCE_STATE,
    [evidenceByProject],
  );

  const setEvidenceFor = useCallback(
    (projectId: string, updater: (prev: EvidenceState) => EvidenceState) => {
      setEvidenceByProject((prev) => ({
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
        setEvidenceFor(projectId, (prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));
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
          setEvidenceFor(projectId, (prev) => ({
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

      setEvidenceFor(projectId, (prev) => ({
        ...prev,
        files: [persisted, ...prev.files.filter((f) => f.id !== persisted.id)],
      }));

      void addLogEntry({
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
      const existing = current?.files.find((f) => f.id === fileId);

      // Optimistically remove so the UI feels snappy; restore on failure.
      setEvidenceFor(projectId, (prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== fileId),
      }));

      try {
        await apiDeleteEvidenceFile(projectId, fileId);
      } catch (err) {
        if (existing) {
          setEvidenceFor(projectId, (prev) => ({
            ...prev,
            files: [existing, ...prev.files.filter((f) => f.id !== existing.id)],
          }));
        }
        throw err;
      }

      if (existing) {
        void addLogEntry({
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
      board: {
        provider: BoardProvider;
        url: string;
        embedUrl: string;
        title: string;
        linkedBy: string;
      },
    ): Promise<LinkedBoard> => {
      const created = await apiCreateLinkedBoard(projectId, board);
      const persisted = normalizeBoard(created);

      setEvidenceFor(projectId, (prev) => ({
        ...prev,
        boards: [persisted, ...prev.boards.filter((b) => b.id !== persisted.id)],
      }));

      void addLogEntry({
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
      const existing = current?.boards.find((b) => b.id === boardId);

      setEvidenceFor(projectId, (prev) => ({
        ...prev,
        boards: prev.boards.filter((b) => b.id !== boardId),
      }));

      try {
        await apiDeleteLinkedBoard(projectId, boardId);
      } catch (err) {
        if (existing) {
          setEvidenceFor(projectId, (prev) => ({
            ...prev,
            boards: [existing, ...prev.boards.filter((b) => b.id !== existing.id)],
          }));
        }
        throw err;
      }

      if (existing) {
        void addLogEntry({
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

  // -- Organisation -------------------------------------------------------
  const renameOrganisation = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = await apiUpdateOrganisation({ name: trimmed });
    setOrganisation({ id: updated.id, name: updated.name });
  }, []);

  // -- Teams --------------------------------------------------------------
  const addTeam = useCallback(
    async ({ name, description = '' }: { name: string; description?: string }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const created = await apiCreateTeam({ name: trimmed, description });
      setTeams((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          description: created.description,
          teammateIds: [...created.teammateIds],
        },
      ]);
    },
    [],
  );

  const renameTeam = useCallback(
    async (teamId: string, name: string, description?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const body: { name?: string; description?: string } = { name: trimmed };
      if (description !== undefined) body.description = description;
      const updated = await apiUpdateTeam(teamId, body);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                id: updated.id,
                name: updated.name,
                description: updated.description,
                teammateIds: [...updated.teammateIds],
              }
            : t,
        ),
      );
    },
    [],
  );

  const deleteTeam = useCallback(async (teamId: string) => {
    await apiDeleteTeam(teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setTeammates((prev) =>
      prev.map((m) => ({ ...m, teamIds: m.teamIds.filter((id) => id !== teamId) })),
    );
    setProjects((prev) =>
      prev.map((p) => (p.teamId === teamId ? { ...p, teamId: undefined } : p)),
    );
  }, []);

  // -- Teammates ----------------------------------------------------------
  const addTeammate = useCallback(
    async ({
      name,
      email = '',
      role = '',
      teamIds = [],
    }: {
      name: string;
      email?: string;
      role?: string;
      teamIds?: string[];
    }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const cleanTeamIds = Array.from(new Set(teamIds));
      const created = await apiCreateTeammate({
        name: trimmed,
        email,
        role,
        teamIds: cleanTeamIds,
      });
      setTeammates((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          teamIds: [...created.teamIds],
        },
      ]);
      // Mirror the new membership into the local teams list so consumers don't
      // have to refetch /teams to see it.
      if (created.teamIds.length > 0) {
        setTeams((prev) =>
          prev.map((t) =>
            created.teamIds.includes(t.id) && !t.teammateIds.includes(created.id)
              ? { ...t, teammateIds: [...t.teammateIds, created.id] }
              : t,
          ),
        );
      }
    },
    [],
  );

  const updateTeammate = useCallback(
    async (
      teammateId: string,
      updates: Partial<Pick<Teammate, 'name' | 'email' | 'role'>>,
    ) => {
      const updated = await apiUpdateTeammate(teammateId, updates);
      setTeammates((prev) =>
        prev.map((m) =>
          m.id === teammateId
            ? {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                teamIds: [...updated.teamIds],
              }
            : m,
        ),
      );
    },
    [],
  );

  const deleteTeammate = useCallback(async (teammateId: string) => {
    await apiDeleteTeammate(teammateId);
    setTeammates((prev) => prev.filter((m) => m.id !== teammateId));
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        teammateIds: t.teammateIds.filter((id) => id !== teammateId),
      })),
    );
  }, []);

  const addTeammateToTeam = useCallback(
    async (teamId: string, teammateId: string) => {
      const updatedTeam = await apiAddTeamMember(teamId, teammateId);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                id: updatedTeam.id,
                name: updatedTeam.name,
                description: updatedTeam.description,
                teammateIds: [...updatedTeam.teammateIds],
              }
            : t,
        ),
      );
      setTeammates((prev) =>
        prev.map((m) =>
          m.id === teammateId && !m.teamIds.includes(teamId)
            ? { ...m, teamIds: [...m.teamIds, teamId] }
            : m,
        ),
      );
    },
    [],
  );

  const removeTeammateFromTeam = useCallback(
    async (teamId: string, teammateId: string) => {
      const updatedTeam = await apiRemoveTeamMember(teamId, teammateId);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                id: updatedTeam.id,
                name: updatedTeam.name,
                description: updatedTeam.description,
                teammateIds: [...updatedTeam.teammateIds],
              }
            : t,
        ),
      );
      setTeammates((prev) =>
        prev.map((m) =>
          m.id === teammateId
            ? { ...m, teamIds: m.teamIds.filter((id) => id !== teamId) }
            : m,
        ),
      );
    },
    [],
  );

  // -- Projects -----------------------------------------------------------
  const addProject = useCallback(
    async ({
      name,
      meta = '',
      stage = 'Intake',
      teamId,
    }: {
      name: string;
      meta?: string;
      stage?: Project['stage'];
      teamId?: string;
    }): Promise<string> => {
      const trimmed = name.trim();
      if (!trimmed) return '';
      const created = await apiCreateProject({
        name: trimmed,
        meta,
        stage: stage as CreateProjectRequestStage,
        ...(teamId ? { teamId } : {}),
      });
      const project = normalizeProject(created);
      setProjects((prev) => [...prev, project]);
      return project.id;
    },
    [],
  );

  const setProjectTeam = useCallback(
    async (projectId: string, teamId: string | undefined) => {
      const updated = await apiUpdateProject(projectId, { teamId: teamId ?? null });
      const project = normalizeProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? project : p)));
    },
    [],
  );

  // ---------------------------------------------------------------------
  // Provider value
  // ---------------------------------------------------------------------
  return (
    <AppContext.Provider
      value={{
        authUser: PLACEHOLDER_USER,
        currentView,
        setCurrentView,
        organisation,
        teams,
        teammates,
        projects,
        tasks,
        stakeholders,
        logEntries,
        selectedProjectId,
        setSelectedProjectId,
        openProject,
        isTaskModalOpen,
        setTaskModalOpen,
        isStakeholderModalOpen,
        setStakeholderModalOpen,
        isLogModalOpen,
        setLogModalOpen,
        isProjectModalOpen,
        setProjectModalOpen,
        editingTaskId,
        setEditingTaskId,
        addTask,
        moveTask,
        updateTask,
        updateTaskDependencies,
        deleteTask,
        addStakeholder,
        addLogEntry,
        getProjectEvidence,
        loadProjectEvidence,
        uploadEvidenceFile,
        removeEvidenceFile,
        addLinkedBoard,
        removeLinkedBoard,
        renameOrganisation,
        addTeam,
        renameTeam,
        deleteTeam,
        addTeammate,
        updateTeammate,
        deleteTeammate,
        addTeammateToTeam,
        removeTeammateFromTeam,
        addProject,
        setProjectTeam,
      }}
    >
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
