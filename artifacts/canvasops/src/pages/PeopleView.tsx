import { useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Team } from '../types';

export function PeopleView() {
  const {
    organisation, renameOrganisation,
    teams, addTeam, renameTeam, deleteTeam,
    teammates, addTeammate, updateTeammate, deleteTeammate,
    addTeammateToTeam, removeTeammateFromTeam,
  } = useAppContext();

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams[0]?.id ?? null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgDraft, setOrgDraft] = useState(organisation.name);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  const [newMateName, setNewMateName] = useState('');
  const [newMateEmail, setNewMateEmail] = useState('');
  const [newMateRole, setNewMateRole] = useState('');

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamDraftName, setTeamDraftName] = useState('');
  const [teamDraftDesc, setTeamDraftDesc] = useState('');

  const [editingMateId, setEditingMateId] = useState<string | null>(null);
  const [mateDraftName, setMateDraftName] = useState('');
  const [mateDraftEmail, setMateDraftEmail] = useState('');
  const [mateDraftRole, setMateDraftRole] = useState('');

  const selectedTeam = useMemo(
    () => teams.find(t => t.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const teamsById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const memberCount = (team: Team) => team.teammateIds.length;

  const handleSaveOrg = () => {
    const name = orgDraft.trim();
    if (!name) {
      setOrgDraft(organisation.name);
      setEditingOrg(false);
      return;
    }
    renameOrganisation(name);
    setEditingOrg(false);
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    addTeam({ name: newTeamName, description: newTeamDesc });
    setNewTeamName('');
    setNewTeamDesc('');
  };

  const handleAddMate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMateName.trim()) return;
    addTeammate({ name: newMateName, email: newMateEmail, role: newMateRole });
    setNewMateName('');
    setNewMateEmail('');
    setNewMateRole('');
  };

  const startEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamDraftName(team.name);
    setTeamDraftDesc(team.description);
  };

  const saveTeamEdit = () => {
    if (!editingTeamId) return;
    renameTeam(editingTeamId, teamDraftName, teamDraftDesc);
    setEditingTeamId(null);
  };

  const startEditMate = (id: string) => {
    const mate = teammates.find(m => m.id === id);
    if (!mate) return;
    setEditingMateId(id);
    setMateDraftName(mate.name);
    setMateDraftEmail(mate.email);
    setMateDraftRole(mate.role);
  };

  const saveMateEdit = () => {
    if (!editingMateId) return;
    updateTeammate(editingMateId, { name: mateDraftName, email: mateDraftEmail, role: mateDraftRole });
    setEditingMateId(null);
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const ok = window.confirm(`Delete team "${team.name}"? Teammates will remain but be unassigned from this team.`);
    if (!ok) return;
    deleteTeam(teamId);
    if (selectedTeamId === teamId) {
      const next = teams.find(t => t.id !== teamId);
      setSelectedTeamId(next?.id ?? null);
    }
  };

  const handleDeleteMate = (teammateId: string) => {
    const mate = teammates.find(m => m.id === teammateId);
    if (!mate) return;
    const ok = window.confirm(`Remove "${mate.name}" from the organisation?`);
    if (!ok) return;
    deleteTeammate(teammateId);
  };

  const nonMembers = selectedTeam
    ? teammates.filter(m => !selectedTeam.teammateIds.includes(m.id))
    : [];

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace settings</div>
          <h1>People &amp; Teams</h1>
          <p className="sub flush">Manage your organisation, the teams inside it, and the teammates who deliver your projects.</p>
        </div>
      </div>

      <div className="card pad org-card">
        <div className="eyebrow">Organisation</div>
        {editingOrg ? (
          <div className="org-edit-row">
            <input
              className="field-input"
              value={orgDraft}
              onChange={e => setOrgDraft(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveOrg();
                if (e.key === 'Escape') {
                  setOrgDraft(organisation.name);
                  setEditingOrg(false);
                }
              }}
            />
            <div className="cluster-sm">
              <button className="btn" onClick={() => { setOrgDraft(organisation.name); setEditingOrg(false); }}>Cancel</button>
              <button className="btn primary" onClick={handleSaveOrg}>Save</button>
            </div>
          </div>
        ) : (
          <div className="org-display-row">
            <div className="org-name">{organisation.name}</div>
            <button className="btn" onClick={() => { setOrgDraft(organisation.name); setEditingOrg(true); }}>
              Rename organisation
            </button>
          </div>
        )}
        <div className="caption">{teams.length} {teams.length === 1 ? 'team' : 'teams'} · {teammates.length} {teammates.length === 1 ? 'teammate' : 'teammates'}</div>
      </div>

      <div className="people-layout">
        <div className="stack">
          <div className="card pad">
            <div className="toolbar">
              <div>
                <div className="section-title tight">Teams</div>
                <div className="muted-meta">Group teammates by discipline, function, or product area.</div>
              </div>
            </div>

            <form className="people-add-form" onSubmit={handleAddTeam}>
              <input
                className="field-input"
                placeholder="New team name"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
              />
              <input
                className="field-input"
                placeholder="Description (optional)"
                value={newTeamDesc}
                onChange={e => setNewTeamDesc(e.target.value)}
              />
              <button type="submit" className="btn primary" disabled={!newTeamName.trim()}>+ Add team</button>
            </form>

            <div className="team-list">
              {teams.length === 0 && (
                <div className="people-empty">No teams yet — add one above to get started.</div>
              )}
              {teams.map(team => (
                <div
                  key={team.id}
                  className={`team-row ${selectedTeamId === team.id ? 'selected' : ''}`}
                >
                  {editingTeamId === team.id ? (
                    <div className="team-edit">
                      <input
                        className="field-input"
                        value={teamDraftName}
                        onChange={e => setTeamDraftName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className="field-input"
                        placeholder="Description"
                        value={teamDraftDesc}
                        onChange={e => setTeamDraftDesc(e.target.value)}
                      />
                      <div className="cluster-sm">
                        <button className="btn" onClick={() => setEditingTeamId(null)}>Cancel</button>
                        <button className="btn primary" onClick={saveTeamEdit} disabled={!teamDraftName.trim()}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="team-row-main"
                        onClick={() => setSelectedTeamId(team.id)}
                      >
                        <div className="item-title">{team.name}</div>
                        <div className="item-sub">
                          {memberCount(team)} {memberCount(team) === 1 ? 'member' : 'members'}
                          {team.description ? ` · ${team.description}` : ''}
                        </div>
                      </button>
                      <div className="cluster-sm">
                        <button className="btn" onClick={() => startEditTeam(team)}>Rename</button>
                        <button className="btn" onClick={() => handleDeleteTeam(team.id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedTeam && (
            <div className="card pad">
              <div className="toolbar">
                <div>
                  <div className="section-title tight">{selectedTeam.name}</div>
                  <div className="muted-meta">
                    {selectedTeam.description || 'No description yet.'}
                  </div>
                </div>
              </div>

              <div className="eyebrow">Members</div>
              {selectedTeam.teammateIds.length === 0 ? (
                <div className="people-empty">No members yet — add someone from the list below.</div>
              ) : (
                <div className="member-list">
                  {selectedTeam.teammateIds.map(id => {
                    const mate = teammates.find(m => m.id === id);
                    if (!mate) return null;
                    return (
                      <div key={id} className="member-row">
                        <div>
                          <div className="item-title">{mate.name}</div>
                          <div className="item-sub">{mate.role || '—'}{mate.email ? ` · ${mate.email}` : ''}</div>
                        </div>
                        <button
                          className="btn"
                          onClick={() => removeTeammateFromTeam(selectedTeam.id, id)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {nonMembers.length > 0 && (
                <>
                  <div className="divider"></div>
                  <div className="eyebrow">Add to this team</div>
                  <div className="add-mate-list">
                    {nonMembers.map(mate => (
                      <div key={mate.id} className="member-row">
                        <div>
                          <div className="item-title">{mate.name}</div>
                          <div className="item-sub">{mate.role || '—'}</div>
                        </div>
                        <button
                          className="btn primary"
                          onClick={() => addTeammateToTeam(selectedTeam.id, mate.id)}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card pad">
            <div className="toolbar">
              <div>
                <div className="section-title tight">Teammates</div>
                <div className="muted-meta">Everyone in {organisation.name}, and the teams they belong to.</div>
              </div>
            </div>

            <form className="people-add-form" onSubmit={handleAddMate}>
              <input
                className="field-input"
                placeholder="Name"
                value={newMateName}
                onChange={e => setNewMateName(e.target.value)}
              />
              <input
                className="field-input"
                type="email"
                placeholder="Email (optional)"
                value={newMateEmail}
                onChange={e => setNewMateEmail(e.target.value)}
              />
              <input
                className="field-input"
                placeholder="Role (optional)"
                value={newMateRole}
                onChange={e => setNewMateRole(e.target.value)}
              />
              <button type="submit" className="btn primary" disabled={!newMateName.trim()}>+ Add teammate</button>
            </form>

            <div className="teammate-list">
              {teammates.length === 0 && (
                <div className="people-empty">No teammates yet — add one above.</div>
              )}
              {teammates.map(mate => (
                <div key={mate.id} className="teammate-row">
                  {editingMateId === mate.id ? (
                    <div className="team-edit">
                      <input
                        className="field-input"
                        value={mateDraftName}
                        onChange={e => setMateDraftName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className="field-input"
                        placeholder="Email"
                        type="email"
                        value={mateDraftEmail}
                        onChange={e => setMateDraftEmail(e.target.value)}
                      />
                      <input
                        className="field-input"
                        placeholder="Role"
                        value={mateDraftRole}
                        onChange={e => setMateDraftRole(e.target.value)}
                      />
                      <div className="cluster-sm">
                        <button className="btn" onClick={() => setEditingMateId(null)}>Cancel</button>
                        <button className="btn primary" onClick={saveMateEdit} disabled={!mateDraftName.trim()}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="teammate-main">
                        <div className="item-title">{mate.name}</div>
                        <div className="item-sub">{mate.role || '—'}{mate.email ? ` · ${mate.email}` : ''}</div>
                        <div className="teammate-tags">
                          {mate.teamIds.length === 0 ? (
                            <span className="tag">Unassigned</span>
                          ) : (
                            mate.teamIds.map(tid => {
                              const t = teamsById.get(tid);
                              if (!t) return null;
                              return <span key={tid} className="tag tag-team">{t.name}</span>;
                            })
                          )}
                        </div>
                      </div>
                      <div className="cluster-sm">
                        <button className="btn" onClick={() => startEditMate(mate.id)}>Edit</button>
                        <button className="btn" onClick={() => handleDeleteMate(mate.id)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
