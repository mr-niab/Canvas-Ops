import { useEffect, useRef, useState } from 'react';
import { AppProvider, useAppContext } from './AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { HomeView } from './pages/HomeView';
import { ProjectView } from './pages/ProjectView';
import { WorkflowView } from './pages/WorkflowView';
import { StakeholdersView } from './pages/StakeholdersView';
import { LogView } from './pages/LogView';
import { PeopleView } from './pages/PeopleView';

const MOBILE_QUERY = '(max-width: 1100px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

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
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const closeMobileNav = () => {
    setMobileNavOpen((wasOpen) => {
      if (wasOpen) {
        requestAnimationFrame(() => menuBtnRef.current?.focus());
      }
      return false;
    });
  };

  useEffect(() => {
    if (!isMobile && mobileNavOpen) setMobileNavOpen(false);
  }, [isMobile, mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const sidebarHidden = isMobile && !mobileNavOpen;

  return (
    <div className={`app${mobileNavOpen ? ' mobile-nav-open' : ''}`}>
      <Sidebar
        mobileOpen={mobileNavOpen}
        hidden={sidebarHidden}
        onNavigate={closeMobileNav}
      />
      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={closeMobileNav}
          aria-hidden
        />
      )}
      <main className="main">
        <Topbar
          menuBtnRef={menuBtnRef}
          mobileNavOpen={mobileNavOpen}
          onMenuClick={() => setMobileNavOpen((v) => !v)}
        />
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
