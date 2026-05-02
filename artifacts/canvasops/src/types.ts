export type View = 'home' | 'project' | 'work' | 'stakeholders' | 'log' | 'people';

export type Stage = 'Intake' | 'Discovery' | 'Alpha' | 'Beta' | 'Live';

export type Discipline = 'UX/UI Design' | 'User Research' | 'Service Design';

export type EvidenceFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  addedBy: string;
  addedAt: string;
  previewUrl?: string;
};

export type BoardProvider = 'miro' | 'figjam';

export type LinkedBoard = {
  id: string;
  provider: BoardProvider;
  url: string;
  embedUrl: string;
  title: string;
  linkedBy: string;
  linkedAt: string;
};

export type ProjectEvidence = {
  files: EvidenceFile[];
  boards: LinkedBoard[];
};

export type Project = {
  id: string;
  name: string;
  meta: string;
  stage: Stage;
  stageClass: string;
  status: string;
  statusClass: string;
  progress: number;
  totalProgress: number;
  evidence: ProjectEvidence;
  teamId?: string;
};

export type Task = {
  id: string;
  discipline: Discipline;
  title: string;
  status: string;
  dependencies: string[];
  /**
   * The status the task had before being auto-set to "Blocked" by an
   * unfinished dependency. Used to restore the prior status once all
   * dependencies are satisfied. Absent on tasks that aren't auto-blocked.
   */
  previousStatus?: string;
};

export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  email: string;
  lastContacted: string;
  status: string;
  statusClass: string;
};

export type LogEntry = {
  id: string;
  date: string;
  actor: string;
  type: string;
  typeClass: string;
  detail: string;
};

export type Organisation = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  description: string;
  teammateIds: string[];
};

export type Teammate = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamIds: string[];
};

export type AppState = {
  currentView: View;
  organisation: Organisation;
  teams: Team[];
  teammates: Teammate[];
  projects: Project[];
  tasks: Task[];
  stakeholders: Stakeholder[];
  logEntries: LogEntry[];

  // Modals
  isTaskModalOpen: boolean;
  isStakeholderModalOpen: boolean;
  isLogModalOpen: boolean;
};
