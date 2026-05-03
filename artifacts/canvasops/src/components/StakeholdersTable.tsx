import { useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Stakeholder } from '../types';

type SortKey = 'name' | 'role' | 'email' | 'project' | 'department' | 'lastContacted' | 'status';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'project', label: 'Project' },
  { key: 'department', label: 'Department' },
  { key: 'lastContacted', label: 'Last contacted' },
  { key: 'status', label: 'Status' },
];

export function StakeholdersTable() {
  const { stakeholders, projects } = useAppContext();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const projectName = (id: string | null | undefined): string => {
    if (!id) return '';
    return projects.find(p => p.id === id)?.name ?? '';
  };

  const cmp = (a: Stakeholder, b: Stakeholder, key: SortKey): number => {
    const valueOf = (s: Stakeholder): string => {
      if (key === 'project') return projectName(s.projectId).toLowerCase();
      if (key === 'department') return String(s.department ?? '').toLowerCase();
      return String(s[key as keyof Stakeholder] ?? '').toLowerCase();
    };
    const av = valueOf(a);
    const bv = valueOf(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  };

  const sorted = useMemo(() => {
    const out = [...stakeholders].sort((a, b) => cmp(a, b, sortKey));
    return sortDir === 'asc' ? out : out.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeholders, projects, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <table className="table">
      <thead>
        <tr>
          {COLUMNS.map(col => {
            const active = col.key === sortKey;
            const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
            return (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{ cursor: 'pointer', userSelect: 'none', color: active ? 'var(--primary)' : undefined }}
                aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}{arrow}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map(s => {
          const proj = projectName(s.projectId);
          const dept = (s.department ?? '').trim();
          return (
            <tr key={s.id} tabIndex={0}>
              <td><strong>{s.name}</strong></td>
              <td>{s.role}</td>
              <td>{s.email}</td>
              <td>{proj || '—'}</td>
              <td>{dept || '—'}</td>
              <td>{s.lastContacted}</td>
              <td><span className={`badge ${s.statusClass}`}>{s.status}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
