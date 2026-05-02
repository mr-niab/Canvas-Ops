import { useAppContext } from '../AppContext';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Topbar() {
  const { authUser } = useAppContext();

  return (
    <div className="topbar">
      <input className="search" placeholder="Search projects, tasks, stakeholders, evidence…" />
      <button className="btn">Filter</button>
      <span className="topbar-user" title={authUser.email}>
        {authUser.name}
      </span>
      <div className="avatar" aria-hidden>
        {initialsOf(authUser.name)}
      </div>
    </div>
  );
}
