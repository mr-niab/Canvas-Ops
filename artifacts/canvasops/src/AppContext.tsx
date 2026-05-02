import React, { createContext, useContext, useState } from 'react';
import { View, Project, Task, Stakeholder, LogEntry } from './types';
import { initialProjects, initialTasks, initialStakeholders, initialLogEntries } from './data';

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
  addStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  addLogEntry: (entry: Omit<LogEntry, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('home');
  const [projects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(initialLogEntries);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isStakeholderModalOpen, setStakeholderModalOpen] = useState(false);
  const [isLogModalOpen, setLogModalOpen] = useState(false);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [...prev, { ...task, id: `t${Date.now()}` }]);
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
      addTask, addStakeholder, addLogEntry
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
