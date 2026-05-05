export type View = 'home' | 'project' | 'work' | 'stakeholders' | 'log' | 'people' | 'projects';

export type Stage = 'Intake' | 'Discovery' | 'Explore' | 'Build' | 'Launch';

export type Discipline = 'UX/UI Design' | 'User Research' | 'Service Design';

export type EvidenceFile = {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  addedBy: string;
  addedAt: string;
  objectPath: string;
  previewUrl?: string;
};

export type BoardProvider = 'miro' | 'figjam';

export type LinkedBoard = {
  id: string;
  projectId: string;
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
  teamId?: string;
};

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type Task = {
  id: string;
  projectId?: string | null;
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
  priority?: TaskPriority;
  assignee?: string;
};

export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  email: string;
  lastContacted: string;
  status: string;
  statusClass: string;
  projectId?: string | null;
  department?: string | null;
};

export type LogEntry = {
  id: string;
  projectId?: string | null;
  date: string;
  actor: string;
  type: string;
  typeClass: string;
  detail: string;
};

export type ProjectSession = {
  id: string;
  projectId: string;
  title: string;
  scheduledAt: string;
  attendees: string;
  notes: string;
};

export type UpcomingSession = ProjectSession & {
  projectName: string;
};

export type Organisation = {
  id: string;
  name: string;
};

export type Role = 'owner' | 'member';

export type Membership = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  joinedAt: string;
};

export type Invite = {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
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

export type Action = {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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
