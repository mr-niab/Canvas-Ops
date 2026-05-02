import { Project, Task, Stakeholder, LogEntry } from './types';

export const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'Appointment Booking Redesign',
    meta: 'NHS · UX/UI + Research + Service Design · Next session Tue 2pm',
    stage: 'Beta',
    stageClass: 'beta',
    status: 'On track',
    statusClass: 'good',
    progress: 4,
    totalProgress: 5,
  },
  {
    id: 'p2',
    name: 'Staff Portal v2',
    meta: 'Internal tools · UX/UI + Research · Prototype review due',
    stage: 'Alpha',
    stageClass: 'alpha',
    status: 'Needs review',
    statusClass: 'risk',
    progress: 3,
    totalProgress: 5,
  },
  {
    id: 'p3',
    name: 'Payment Journey Simplification',
    meta: 'Finance service · Service Design led · Dependency unresolved',
    stage: 'Discovery',
    stageClass: 'disc',
    status: 'Blocked',
    statusClass: 'blocked',
    progress: 1,
    totalProgress: 5,
  },
  {
    id: 'p4',
    name: 'Digital Forms Overhaul',
    meta: 'Government · UX/UI + Service Design · All gates passed',
    stage: 'Live',
    stageClass: 'good',
    status: 'Shipped',
    statusClass: 'good',
    progress: 5,
    totalProgress: 5,
  },
];

export const initialTasks: Task[] = [
  { id: 't1', discipline: 'UX/UI Design', title: 'Booking confirmation screen', status: 'In review · 2 comments open' },
  { id: 't2', discipline: 'UX/UI Design', title: 'Error state flows', status: 'Designing' },
  { id: 't3', discipline: 'UX/UI Design', title: 'Prototype handoff prep', status: 'Backlog' },
  
  { id: 't4', discipline: 'User Research', title: 'Usability round 2 synthesis', status: 'In progress' },
  { id: 't5', discipline: 'User Research', title: 'Stakeholder playback notes', status: 'Ready for session' },
  { id: 't6', discipline: 'User Research', title: 'Participant recruitment', status: 'Complete' },
  
  { id: 't7', discipline: 'Service Design', title: 'Service blueprint v3', status: 'In progress' },
  { id: 't8', discipline: 'Service Design', title: 'Operational dependency map', status: 'Needs review' },
  { id: 't9', discipline: 'Service Design', title: 'Backstage actions', status: 'Done' },
];

export const initialStakeholders: Stakeholder[] = [
  { id: 's1', name: 'Claire Hendricks', role: 'Project sponsor', email: 'claire.h@example.com', lastContacted: '2 days ago', status: 'Aligned', statusClass: 'good' },
  { id: 's2', name: 'Marcus Bell', role: 'Operations lead', email: 'mbell@example.com', lastContacted: '1 week ago', status: 'Needs update', statusClass: 'risk' },
  { id: 's3', name: 'Priya Nair', role: 'Service owner', email: 'pnair@example.com', lastContacted: 'Yesterday', status: 'Aligned', statusClass: 'good' },
  { id: 's4', name: 'Tom Whitfield', role: 'IT lead', email: 'tom.w@example.com', lastContacted: '3 weeks ago', status: 'Watching', statusClass: 'beta' },
  { id: 's5', name: 'Aoife Murray', role: 'Research representative', email: 'amurray@example.com', lastContacted: 'Never', status: 'Not contacted', statusClass: 'alpha' },
];

export const initialLogEntries: LogEntry[] = [
  { id: 'l1', date: 'Oct 24, 2023 · 14:30', actor: 'Jamie D.', type: 'Conversation', typeClass: 'disc', detail: 'Reviewed round 2 research findings with Claire H. She requested we emphasize the error recovery paths in the next iteration.' },
  { id: 'l2', date: 'Oct 23, 2023 · 09:15', actor: 'Sam T.', type: 'Decision', typeClass: 'beta', detail: 'Agreed to drop SMS notifications for MVP due to API dependency delays. Email only for beta.' },
  { id: 'l3', date: 'Oct 20, 2023 · 16:45', actor: 'Jamie D.', type: 'Stage', typeClass: 'good', detail: 'Project moved from Alpha to Beta following successful gate review.' },
  { id: 'l4', date: 'Oct 18, 2023 · 11:20', actor: 'Alex W.', type: 'File', typeClass: 'alpha', detail: 'Uploaded updated Service Blueprint (v3) incorporating the new call center fallback process.' },
  { id: 'l5', date: 'Oct 15, 2023 · 10:00', actor: 'Jamie D.', type: 'Email', typeClass: 'disc', detail: 'Sent project update to all stakeholders confirming Alpha completion.' },
];
