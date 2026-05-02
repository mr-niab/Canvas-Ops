export type View = 'home' | 'project' | 'work' | 'stakeholders' | 'log';

export type Stage = 'Intake' | 'Discovery' | 'Alpha' | 'Beta' | 'Live';

export type Discipline = 'UX/UI Design' | 'User Research' | 'Service Design';

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
};

export type Task = {
  id: string;
  discipline: Discipline;
  title: string;
  status: string;
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

export type AppState = {
  currentView: View;
  projects: Project[];
  tasks: Task[];
  stakeholders: Stakeholder[];
  logEntries: LogEntry[];
  
  // Modals
  isTaskModalOpen: boolean;
  isStakeholderModalOpen: boolean;
  isLogModalOpen: boolean;
};
