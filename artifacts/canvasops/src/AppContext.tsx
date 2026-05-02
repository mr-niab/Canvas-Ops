import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Project, Task, Stakeholder, LogEntry } from './types';
import { initialProjects, initialTasks, initialStakeholders, initialLogEntries } from './data';

const TASKS_STORAGE_KEY = 'canvasops:tasks:v1';

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
        typeof (t as Task).discipline === 'string'
    );
    return valid ? (parsed as Task[]) : initialTasks;
  } catch {
    return initialTasks;
  }
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

  addTask: (task: Omit<Task, 'id'>) => void;
  moveTask: (taskId: string, targetDiscipline: Task['discipline'], targetIndex: number) => void;
  addStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('home');
  const [projects] = useState<Project[]>(initialProjects);
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

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [...prev, { ...task, id: `t${Date.now()}` }]);
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

  const addStakeholder = (stakeholder: Omit<Stakeholder, 'id'>) => {
    setStakeholders(prev => [...prev, { ...stakeholder, id: `s${Date.now()}` }]);
  };

  const addLogEntry = (entry: Omit<LogEntry, 'id'>) => {
    setLogEntries(prev => [{ ...entry, id: `l${Date.now()}` }, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView,
      projects, tasks, stakeholders, logEntries,
      isTaskModalOpen, setTaskModalOpen,
      isStakeholderModalOpen, setStakeholderModalOpen,
      isLogModalOpen, setLogModalOpen,
      addTask, moveTask, addStakeholder, addLogEntry
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
