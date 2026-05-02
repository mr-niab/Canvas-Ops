import { useState } from 'react';
import { useAppContext } from '../AppContext';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Topbar() {
  const { authUser, signOut } = useAppContext();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="topbar">
      <input className="search" placeholder="Search projects, tasks, stakeholders, evidence…" />
      <button className="btn">Filter</button>
      {authUser && (
        <>
          <span className="topbar-user" title={authUser.email}>
            {authUser.name}
          </span>
          <button className="btn" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <div className="avatar" aria-hidden>
            {initialsOf(authUser.name)}
          </div>
        </>
      )}
    </div>
  );
}
