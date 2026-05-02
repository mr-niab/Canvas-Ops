// All seed data was removed when Project Canvas moved to a real backend in #22.
// Each signed-in user now starts with an empty workspace and populates it via
// the in-app create flows; the placeholder Northwind studio / sample projects
// no longer exist.
//
// Type re-exports kept here so existing imports keep resolving.
export type {
  Project,
  Task,
  Stakeholder,
  LogEntry,
  Organisation,
  Team,
  Teammate,
} from './types';
