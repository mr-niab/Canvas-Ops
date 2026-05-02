import { useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Stakeholder } from '../types';

type SortKey = 'name' | 'role' | 'email' | 'lastContacted' | 'status';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'lastContacted', label: 'Last contacted' },
  { key: 'status', label: 'Status' },
];

function cmp(a: Stakeholder, b: Stakeholder, key: SortKey): number {
  const av = String(a[key] ?? '').toLowerCase();
  const bv = String(b[key] ?? '').toLowerCase();
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

export function StakeholdersTable() {
  const { stakeholders } = useAppContext();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const out = [...stakeholders].sort((a, b) => cmp(a, b, sortKey));
    return sortDir === 'asc' ? out : out.reverse();
  }, [stakeholders, sortKey, sortDir]);

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
        {sorted.map(s => (
          <tr key={s.id} tabIndex={0}>
            <td><strong>{s.name}</strong></td>
            <td>{s.role}</td>
            <td>{s.email}</td>
            <td>{s.lastContacted}</td>
            <td><span className={`badge ${s.statusClass}`}>{s.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
