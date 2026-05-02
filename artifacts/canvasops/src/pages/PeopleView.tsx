import { useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Role, Team } from '../types';

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Unexpected error';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PeopleView() {
  const {
    authUser,
    currentRole,
    members,
    invites,
    inviteMember,
    cancelInvite,
    removeMember,
    buildInviteLink,
    organisation,
    renameOrganisation,
    teams,
    addTeam,
    renameTeam,
    deleteTeam,
    teammates,
    addTeammate,
    updateTeammate,
    deleteTeammate,
    addTeammateToTeam,
    removeTeammateFromTeam,
  } = useAppContext();

  const isOwner = currentRole === 'owner';

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

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviteSubmitting) return;
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      setInviteError(describeError(err));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCopyInvite = async (inviteId: string) => {
    const link = buildInviteLink(inviteId);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt('Copy invite link:', link);
      }
      setCopiedInviteId(inviteId);
      window.setTimeout(() => {
        setCopiedInviteId((current) => (current === inviteId ? null : current));
      }, 2000);
    } catch {
      window.prompt('Copy invite link:', link);
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    const ok = window.confirm(`Cancel invite for ${email}?`);
    if (!ok) return;
    try {
      await cancelInvite(inviteId);
    } catch (err) {
      window.alert(describeError(err));
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    const ok = window.confirm(`Remove ${name} from the organisation? They will lose access immediately.`);
    if (!ok) return;
    try {
      await removeMember(userId);
    } catch (err) {
      window.alert(describeError(err));
    }
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
          <p className="sub flush">Manage your organisation, the people who can sign in, and the teams that deliver your projects.</p>
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
            {isOwner && (
              <button className="btn" onClick={() => { setOrgDraft(organisation.name); setEditingOrg(true); }}>
                Rename organisation
              </button>
            )}
          </div>
        )}
        <div className="caption">
          {members.length} {members.length === 1 ? 'member' : 'members'}
          {' · '}
          {invites.length} pending {invites.length === 1 ? 'invite' : 'invites'}
          {' · '}
          {teams.length} {teams.length === 1 ? 'team' : 'teams'}
        </div>
      </div>

      <div className="card pad">
        <div className="toolbar">
          <div>
            <div className="section-title tight">Members</div>
            <div className="muted-meta">
              People who can sign in to {organisation.name}.
              {!isOwner && ' Only owners can invite or remove members.'}
            </div>
          </div>
        </div>

        {isOwner && (
          <form className="people-add-form" onSubmit={handleSendInvite}>
            <input
              className="field-input"
              type="email"
              placeholder="Email to invite"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
            <select
              className="field-input"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
            >
              <option value="member">Member</option>
              <option value="owner">Owner</option>
            </select>
            <button
              type="submit"
              className="btn primary"
              disabled={!inviteEmail.trim() || inviteSubmitting}
            >
              {inviteSubmitting ? 'Sending…' : '+ Send invite'}
            </button>
          </form>
        )}
        {inviteError && <div className="people-empty">{inviteError}</div>}

        <div className="member-list">
          {members.length === 0 ? (
            <div className="people-empty">No members yet.</div>
          ) : (
            members.map(m => {
              const isSelf = m.userId === authUser.id;
              return (
                <div key={m.userId} className="member-row">
                  <div>
                    <div className="item-title">
                      {m.name}{isSelf ? ' (you)' : ''}
                      <span className="tag" style={{ marginLeft: 8 }}>{m.role}</span>
                    </div>
                    <div className="item-sub">{m.email} · joined {formatDate(m.joinedAt)}</div>
                  </div>
                  {isOwner && !isSelf && (
                    <button className="btn" onClick={() => handleRemoveMember(m.userId, m.name)}>
                      Remove
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {invites.length > 0 && (
          <>
            <div className="divider"></div>
            <div className="eyebrow">Pending invites</div>
            <div className="member-list">
              {invites.map(inv => (
                <div key={inv.id} className="member-row">
                  <div>
                    <div className="item-title">
                      {inv.email}
                      <span className="tag" style={{ marginLeft: 8 }}>{inv.role}</span>
                    </div>
                    <div className="item-sub">
                      Invited {formatDate(inv.createdAt)} · expires {formatDate(inv.expiresAt)}
                    </div>
                  </div>
                  <div className="cluster-sm">
                    <button className="btn" onClick={() => handleCopyInvite(inv.id)}>
                      {copiedInviteId === inv.id ? 'Copied!' : 'Copy link'}
                    </button>
                    {isOwner && (
                      <button className="btn" onClick={() => handleCancelInvite(inv.id, inv.email)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
