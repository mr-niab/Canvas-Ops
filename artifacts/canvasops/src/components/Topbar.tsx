import type { RefObject } from 'react';
import { useAppContext } from '../AppContext';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TopbarProps {
  menuBtnRef: RefObject<HTMLButtonElement | null>;
  mobileNavOpen: boolean;
  onMenuClick: () => void;
}

export function Topbar({ menuBtnRef, mobileNavOpen, onMenuClick }: TopbarProps) {
  const { authUser } = useAppContext();

  return (
    <div className="topbar">
      <button
        ref={menuBtnRef}
        type="button"
        className="menu-btn"
        onClick={onMenuClick}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
        aria-controls="primary-nav"
      >
        <span className="menu-btn-bars" aria-hidden>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <input className="search" placeholder="Search projects, tasks, stakeholders, evidence…" />
      <span className="topbar-user" title={authUser.email}>
        {authUser.name}
      </span>
      <div className="avatar" aria-hidden>
        {initialsOf(authUser.name)}
      </div>
    </div>
  );
}
