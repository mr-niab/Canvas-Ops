import { AppProvider, useAppContext } from './AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { HomeView } from './pages/HomeView';
import { ProjectView } from './pages/ProjectView';
import { WorkflowView } from './pages/WorkflowView';
import { StakeholdersView } from './pages/StakeholdersView';
import { LogView } from './pages/LogView';
import { PeopleView } from './pages/PeopleView';

function ViewRouter() {
  const { currentView } = useAppContext();
  switch (currentView) {
    case 'home':
      return <HomeView />;
    case 'project':
      return <ProjectView />;
    case 'work':
      return <WorkflowView />;
    case 'stakeholders':
      return <StakeholdersView />;
    case 'log':
      return <LogView />;
    case 'people':
      return <PeopleView />;
    default:
      return <HomeView />;
  }
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Topbar />
        <ViewRouter />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
