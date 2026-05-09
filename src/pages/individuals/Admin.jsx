import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Navbar from '@/components/ui/navbar.jsx';
import AuthModal from '@/log/forms/authmodal.jsx';
import { logAudit, notifyUser } from '@/lib/notify.js';


// Admin / Owner control center.
// One page w/ four tabs: Users (roles + moderation), Listings, Reports, Dashboard 
// Gated to role in {'admin','owner'}.

const ROLE_OPTIONS = [
  { value: '', label: 'User (no role)' },
  { value: 'support', label: 'Support' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

const roleBadgeClass = (role) => {
  switch (role) {
    case 'owner': return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
    case 'admin': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'support': return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
    default: return 'bg-white/5 text-gray-400 border border-white/10';
  }
};

const statusBadgeClass = (status) => {
  switch (status) {
    case 'banned': return 'bg-red-500/15 text-red-300 border border-red-500/30';
    case 'suspended': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    default: return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  }
};

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'online', label: 'Online Users' },
  { id: 'listings', label: 'Listings' },
  { id: 'cards', label: 'Cards' },
  { id: 'reports', label: 'Reports' },
  { id: 'support', label: 'Support Requests' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'dashboard', label: 'Dashboard' },
];

const Stat = ({ label, value, sub }) => (
  <div className="admin-stat">
    <div className="admin-stat-label">{label}</div>
    <div className="admin-stat-value">{value}</div>
    {sub && <div className="admin-stat-sub">{sub}</div>}
  </div>
);


// Online users tab
const OnlineUsersTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    setTableMissing(false);

    const onlineThresholdIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from('user_presence')
      .select('session_id, user_id, ip_address, user_agent, last_seen, users:user_id(username)')
      .gte('last_seen', onlineThresholdIso)
      .order('last_seen', { ascending: false });

    if (queryError) {
      if (/does not exist|schema cache/i.test(queryError.message || '')) {
        setTableMissing(true);
      } else {
        setError('Failed to load online users: ' + queryError.message);
      }
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-table-container">
      {tableMissing && (
        <div className="admin-warning">Presence table missing. Run the migration section for user_presence to enable online IP tracking.</div>
      )}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">User</th>
                <th className="admin-table-header">IP Address</th>
                <th className="admin-table-header">Last Seen</th>
                <th className="admin-table-header">Session</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={4} className="admin-table-loading">Loading online users...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={4} className="admin-table-empty">No users currently online.</td></tr>}
              {!loading && rows.map((row) => (
                <tr key={row.session_id} className="admin-table-row">
                  <td className="admin-table-cell admin-table-user">{row.users?.username || row.user_id || '-'}</td>
                  <td className="admin-table-cell admin-table-ip">{row.ip_address || 'Unknown'}</td>
                  <td className="admin-table-cell admin-table-lastseen">{row.last_seen ? new Date(row.last_seen).toLocaleString() : '-'}</td>
                  <td className="admin-table-cell admin-table-session">{row.session_id ? row.session_id.slice(0, 12) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Users tab
const UsersTab = ({ viewer, viewerRole }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [legacyUserSchema, setLegacyUserSchema] = useState(false);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [modAction, setModAction] = useState({}); // { [userId]: { action, reason, days } }

  const isOwner = viewerRole === 'owner';

  const load = async () => {
    setLoading(true);
    setError('');
    setLegacyUserSchema(false);
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');

    let usersData = null;
    let ue = null;

    const primaryUsers = await supabase
      .from('users')
      .select('id, username, first_name, last_name, status, status_until, status_reason')
      .order('username');

    usersData = primaryUsers.data;
    ue = primaryUsers.error;

    // Backward-compatible fallback for databases that don't yet have moderation columns
    if (ue && /column\s+users\.(status|status_until|status_reason)\s+does not exist/i.test(ue.message || '')) {
      const legacyUsers = await supabase
        .from('users')
        .select('id, username, first_name, last_name')
        .order('username');
      usersData = (legacyUsers.data || []).map((u) => ({
        ...u,
        status: 'active',
        status_until: null,
        status_reason: null,
      }));
      ue = legacyUsers.error;
      setLegacyUserSchema(true);
    }

    if (ue) {
      setError('Failed to load users: ' + ue.message);
      setLoading(false);
      return;
    }

    const byUser = new Map((rolesData || []).map(r => [r.user_id, r.role]));
    setRows((usersData || []).map(u => ({ ...u, role: byUser.get(u.id) || '' })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const setRoleForUser = async (targetUserId, newRole) => {
    setSavingId(targetUserId);
    try {
      if (!newRole) {
        await supabase.from('user_roles').delete().eq('user_id', targetUserId);
      } else {
        await supabase.from('user_roles').upsert({ user_id: targetUserId, role: newRole }, { onConflict: 'user_id' });
      }
      setRows(prev => prev.map(r => (r.id === targetUserId ? { ...r, role: newRole } : r)));
      await logAudit({
        actorId: viewer.id, actorRole: viewerRole,
        action: 'user.role_change', targetType: 'user', targetId: targetUserId,
        details: { new_role: newRole || null },
      });
    } finally {
      setSavingId(null);
    }
  };

  const applyModeration = async (target, action, reason, days, unit) => {
    if (legacyUserSchema) {
      alert('Moderation fields are not available in this database yet. Run the migration to enable suspend/ban actions.');
      return;
    }
    if (!action) return;
    if (action === 'unsuspend' && target.status !== 'suspended') {
      alert('This user is not currently suspended.');
      return;
    }
    let newStatus = target.status;
    let statusUntil = null;
    if (action === 'warning') newStatus = target.status; // status doesn't change for warnings
    if (action === 'suspension') {
      newStatus = 'suspended';
      const n = parseInt(days, 10) || 1;
      const u = unit || 'days';
      const msPerUnit = u === 'minutes' ? 60_000 : u === 'hours' ? 3_600_000 : 86_400_000;
      statusUntil = new Date(Date.now() + n * msPerUnit).toISOString();
    }
    if (action === 'ban') newStatus = 'banned';
    if (action === 'unban') { newStatus = 'active'; statusUntil = null; }
    if (action === 'unsuspend') { newStatus = 'active'; statusUntil = null; }

    const { error: updErr } = await supabase
      .from('users')
      .update({ status: newStatus, status_until: statusUntil, status_reason: reason || null })
      .eq('id', target.id);
    if (updErr) {
      alert('Failed to update user: ' + updErr.message);
      return;
    }
    await supabase.from('moderation_actions').insert({
      target_user_id: target.id,
      admin_id: viewer.id,
      action,
      reason: reason || null,
      expires_at: statusUntil,
    });
    await logAudit({
      actorId: viewer.id, actorRole: viewerRole,
      action: 'user.' + action, targetType: 'user', targetId: target.id,
      details: { reason: reason || null, expires_at: statusUntil },
    });
    await notifyUser({
      userId: target.id,
      type: 'moderation',
      title: `Account ${action}`,
      body: reason || `Your account received a ${action}.`,
    });
    setRows(prev => prev.map(r => r.id === target.id ? { ...r, status: newStatus, status_until: statusUntil, status_reason: reason || null } : r));
    setModAction(m => ({ ...m, [target.id]: null }));
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [r.username, r.first_name, r.last_name, r.id].some(v => (v || '').toLowerCase().includes(s));
  });

  const ownerCount = rows.filter(r => r.role === 'owner').length;

  return (
    <div className="admin-table-container">
      <div className="admin-table-controls">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username, name, or ID..."
          className="admin-table-search"
        />
        <button
          onClick={() => void load()}
          className="admin-table-refresh"
        >
          Refresh
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {legacyUserSchema && (
        <div className="admin-warning">
          Legacy schema detected: users loaded without moderation fields. Suspend/ban controls are disabled until migration is applied.
        </div>
      )}

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">User</th>
                <th className="admin-table-header">Role</th>
                <th className="admin-table-header">Status</th>
                <th className="admin-table-header admin-table-header-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={4} className="admin-table-loading">Loading users...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={4} className="admin-table-empty">No users found.</td></tr>}
              {!loading && filtered.map(row => {
                const isSelf = row.id === viewer?.id;
                const isOnlyOwner = row.role === 'owner' && ownerCount <= 1;
                const m = modAction[row.id] || { action: '', reason: '', days: 7, unit: 'days' };
                return (
                  <tr key={row.id} className="admin-table-row align-top">
                    <td className="admin-table-cell admin-table-user">
                      <div className="admin-user-main">
                        {row.username || '(no username)'}
                        {isSelf && <span className="admin-user-you">you</span>}
                      </div>
                      <div className="admin-user-name">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '-'}</div>
                      <div className="admin-user-id">{row.id}</div>
                    </td>
                    <td className="admin-table-cell admin-table-role">
                      <div className="admin-role-col">
                        <span className={`admin-role-badge admin-role-badge-${row.role || 'user'}`}>{row.role || 'User'}</span>
                        {isOwner && (
                          <select
                            value={row.role}
                            disabled={savingId === row.id || isOnlyOwner}
                            onChange={e => void setRoleForUser(row.id, e.target.value)}
                            className="admin-role-select"
                          >
                            {ROLE_OPTIONS.map(opt => <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>)}
                          </select>
                        )}
                        {isOnlyOwner && <div className="admin-role-only">Only Owner</div>}
                      </div>
                    </td>
                    <td className="admin-table-cell admin-table-status">
                      <span className={`admin-status-badge admin-status-badge-${row.status || 'active'}`}>{row.status || 'Active'}</span>
                      {row.status === 'suspended' && row.status_until && (
                        <div className="admin-status-until">Until {new Date(row.status_until).toLocaleString()}</div>
                      )}
                      {row.status_reason && (
                        <div className="admin-status-reason" title={row.status_reason}>{row.status_reason}</div>
                      )}
                    </td>
                    <td className="admin-table-cell admin-table-moderation admin-table-cell-right">
                      <div className="admin-moderation-col">
                        <select
                          value={m.action}
                          disabled={legacyUserSchema}
                          onChange={e => setModAction(s => ({ ...s, [row.id]: { ...m, action: e.target.value } }))}
                          className="admin-moderation-select"
                        >
                          <option value="">- Action -</option>
                          <option value="warning">Warn</option>
                          <option value="suspension">Suspend</option>
                          <option value="unsuspend">Unsuspend</option>
                          <option value="ban">Ban</option>
                          <option value="unban">Unban</option>
                        </select>
                        {m.action === 'suspension' && (
                          <div className="admin-moderation-duration-row">
                            <input
                              type="number"
                              min={1}
                              value={m.days}
                              onChange={e => setModAction(s => ({ ...s, [row.id]: { ...m, days: e.target.value } }))}
                              className="admin-moderation-duration"
                              placeholder="Duration"
                            />
                            <select
                              value={m.unit || 'days'}
                              onChange={e => setModAction(s => ({ ...s, [row.id]: { ...m, unit: e.target.value } }))}
                              className="admin-moderation-unit"
                            >
                              <option value="minutes">min</option>
                              <option value="hours">hr</option>
                              <option value="days">day</option>
                            </select>
                          </div>
                        )}
                        {m.action && (
                          <input
                            type="text"
                            value={m.reason}
                            onChange={e => setModAction(s => ({ ...s, [row.id]: { ...m, reason: e.target.value } }))}
                            placeholder="Reason"
                            className="admin-moderation-reason"
                          />
                        )}
                        {m.action && (
                          <button
                            onClick={() => void applyModeration(row, m.action, m.reason, m.days, m.unit)}
                            className="admin-moderation-apply"
                          >
                            Apply {m.action}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};


// Listings tab
const ListingsTab = ({ viewer, viewerRole }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);

    // try the full query 
    let { data, error } = await supabase
      .from('listings')
      .select('id, price, condition, image_url, is_active, cancelled, deleted, seller_id, users:seller_id(username), cards(name, rarity, market_value)')
      .order('created_at', { ascending: false });

    // if cancelled or deleted columns are missing - retry without them
    if (error && /column\s+listings\.(cancelled|deleted)\s+does not exist/i.test(error.message || '')) {
      const step2 = await supabase
        .from('listings')
        .select('id, price, condition, image_url, is_active, seller_id, users:seller_id(username), cards(name, rarity, market_value)')
        .order('created_at', { ascending: false });
      data = (step2.data || []).map(l => ({ ...l, cancelled: false, deleted: null }));
      error = step2.error;
    }

    // if market_value column is also missing - retry without it
    if (error && /market_value/i.test(error.message || '')) {
      const step3 = await supabase
        .from('listings')
        .select('id, price, condition, image_url, is_active, seller_id, users:seller_id(username), cards(name, rarity)')
        .order('created_at', { ascending: false });
      data = (step3.data || []).map(l => ({ ...l, cancelled: false, deleted: null }));
    }

    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const remove = async (listing) => {
    const reason = window.prompt('Reason for removing this listing? (shown to the seller)') || 'Removed by admin';
    const { error } = await supabase
      .from('listings')
      .update({ is_active: false, deleted: new Date().toISOString() })
      .eq('id', listing.id);
    if (error) { alert(error.message); return; }
    await logAudit({
      actorId: viewer.id, actorRole: viewerRole,
      action: 'listing.remove', targetType: 'listing', targetId: listing.id,
      details: { reason },
    });
    await notifyUser({
      userId: listing.seller_id,
      type: 'listing_removed',
      title: 'Your listing was removed',
      body: `An admin removed your "${listing.cards?.name}" listing. Reason: ${reason}`,
    });
    setRows(r => r.map(x => x.id === listing.id ? { ...x, is_active: false, deleted: true } : x));
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [r.cards?.name, r.users?.username, r.condition, r.id].some(v => (v || '').toLowerCase().includes(s));
  });

  return (
    <div className="admin-table-container">
      <div className="admin-table-controls">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by card, seller, condition, or ID..."
          className="admin-table-search"
        />
        <button onClick={() => void load()} className="admin-table-refresh">Refresh</button>
      </div>

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">Card</th>
                <th className="admin-table-header">Seller</th>
                <th className="admin-table-header">Price / Market</th>
                <th className="admin-table-header">Status</th>
                <th className="admin-table-header admin-table-header-right">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={5} className="admin-table-loading">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="admin-table-empty">No listings.</td></tr>}
              {!loading && filtered.map(l => (
                <tr key={l.id} className="admin-table-row">
                  <td className="admin-table-cell">
                    <div className="admin-listing-card-cell">
                      <img src={l.image_url || '/placeholder-card.png'} alt={l.cards?.name} className="admin-listing-img" />
                      <div>
                        <div className="admin-listing-name">{l.cards?.name}</div>
                        <div className="admin-listing-meta">{l.condition} · {l.cards?.rarity}</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table-cell admin-table-user">{l.users?.username || '-'}</td>
                  <td className="admin-table-cell">
                    <div className="admin-listing-price">${Number(l.price).toFixed(2)}</div>
                    <div className="admin-listing-market">market ${Number(l.cards?.market_value || 0).toFixed(2)}</div>
                  </td>
                  <td className="admin-table-cell">
                    <span className={`admin-status-pill ${l.deleted ? 'admin-status-pill-removed' : (l.cancelled ? 'admin-status-pill-cancelled' : (l.is_active ? 'admin-status-pill-active' : 'admin-status-pill-sold'))}`}>
                      {l.deleted ? 'removed' : l.cancelled ? 'cancelled' : l.is_active ? 'active' : 'sold'}
                    </span>
                  </td>
                  <td className="admin-table-cell admin-table-cell-right">
                    {l.is_active && !l.deleted && (
                      <button onClick={() => void remove(l)} className="admin-btn-danger">Force remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Reports tab - pulls from support_tickets where issue_type indicates a report
const ReportsTab = ({ viewer, viewerRole }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, issue_type, description, status, created_at, escalated, user_id, related_user, related_listing, users:user_id(username), related_user_obj:related_user(username), listings:related_listing(cards(name))')
      .in('issue_type', ['scam', 'report_user', 'listing'])
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const close = async (id) => {
    await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', id);
    await logAudit({
      actorId: viewer.id, actorRole: viewerRole,
      action: 'ticket.close', targetType: 'ticket', targetId: id,
    });
    setRows(r => r.map(t => t.id === id ? { ...t, status: 'closed' } : t));
  };

  return (
    <div className="admin-table-container">
      <div className="admin-tab-header">
        <p className="admin-tab-desc">Tickets categorized as reports of users, listings, or scams.</p>
        <button onClick={() => void load()} className="admin-table-refresh">Refresh</button>
      </div>
      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">Type</th>
                <th className="admin-table-header">Reporter</th>
                <th className="admin-table-header">Reported</th>
                <th className="admin-table-header">Description</th>
                <th className="admin-table-header">Status</th>
                <th className="admin-table-header admin-table-header-right">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={6} className="admin-table-loading">Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="admin-table-empty">No reports.</td></tr>}
              {!loading && rows.map(t => (
                <tr key={t.id} className="admin-table-row">
                  <td className="admin-table-cell admin-table-user">{t.issue_type}</td>
                  <td className="admin-table-cell admin-table-lastseen">{t.users?.username || '-'}</td>
                  <td className="admin-table-cell admin-table-lastseen">
                    {t.related_user_obj?.username || '-'}
                    {t.listings?.cards?.name && <div className="admin-listing-meta">{t.listings.cards.name}</div>}
                  </td>
                  <td className="admin-table-cell admin-ticket-desc">{t.description}</td>
                  <td className="admin-table-cell">
                    <span className={`admin-status-pill ${t.status === 'closed' ? 'admin-status-pill-closed' : 'admin-status-pill-open'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="admin-table-cell admin-table-cell-right">
                    {t.status !== 'closed' && (
                      <button onClick={() => void close(t.id)} className="admin-btn-ghost">Close</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Support requests tab - for all support tickets, not just reports
const SupportRequestsTab = ({ viewer, viewerRole }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, issue_type, description, status, created_at, escalated, user_id, related_user, related_listing, users:user_id(username), related_user_obj:related_user(username), listings:related_listing(cards(name))')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const close = async (ticket) => {
    await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', ticket.id);
    await logAudit({
      actorId: viewer.id,
      actorRole: viewerRole,
      action: 'ticket.close',
      targetType: 'ticket',
      targetId: ticket.id,
    });
    await notifyUser({
      userId: ticket.user_id,
      type: 'support_ticket',
      title: 'Support ticket closed',
      body: `Ticket ${ticket.id} has been closed.`,
      link: '/profile',
    });
    setRows(prev => prev.map(row => row.id === ticket.id ? { ...row, status: 'closed' } : row));
  };

  const escalate = async (ticket) => {
    await supabase.from('support_tickets').update({ escalated: true }).eq('id', ticket.id);
    await logAudit({
      actorId: viewer.id,
      actorRole: viewerRole,
      action: 'ticket.escalate',
      targetType: 'ticket',
      targetId: ticket.id,
    });
    setRows(prev => prev.map(row => row.id === ticket.id ? { ...row, escalated: true } : row));
  };

  const visibleRows = rows.filter(row => showClosed ? row.status === 'closed' : row.status !== 'closed');

  return (
    <div className="admin-table-container">
      <div className="admin-tab-header">
        <p className="admin-tab-desc">All support tickets, including buyer and seller disputes.</p>
        <div className="admin-tab-header-actions">
          <button onClick={() => setShowClosed(value => !value)} className="admin-table-refresh">
            {showClosed ? 'Show Open' : 'Show Closed'}
          </button>
          <button onClick={() => void load()} className="admin-table-refresh">Refresh</button>
        </div>
      </div>

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">Type</th>
                <th className="admin-table-header">Submitted By</th>
                <th className="admin-table-header">Related</th>
                <th className="admin-table-header">Description</th>
                <th className="admin-table-header">Status</th>
                <th className="admin-table-header admin-table-header-right">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={6} className="admin-table-loading">Loading...</td></tr>}
              {!loading && visibleRows.length === 0 && <tr><td colSpan={6} className="admin-table-empty">No tickets.</td></tr>}
              {!loading && visibleRows.map(ticket => (
                <tr key={ticket.id} className="admin-table-row align-top">
                  <td className="admin-table-cell admin-table-user">{ticket.issue_type}</td>
                  <td className="admin-table-cell admin-table-lastseen">{ticket.users?.username || '-'}</td>
                  <td className="admin-table-cell admin-table-lastseen">
                    <div>{ticket.related_user_obj?.username || ticket.related_user || '-'}</div>
                    {ticket.listings?.cards?.name && <div className="admin-listing-meta">{ticket.listings.cards.name}</div>}
                  </td>
                  <td className="admin-table-cell admin-ticket-desc">{ticket.description}</td>
                  <td className="admin-table-cell">
                    <div className="admin-ticket-status-cell">
                      <span className={`admin-status-pill ${ticket.status === 'closed' ? 'admin-status-pill-closed' : 'admin-status-pill-open'}`}>
                        {ticket.status}
                      </span>
                      {ticket.escalated && <span className="admin-ticket-escalated">Escalated</span>}
                    </div>
                  </td>
                  <td className="admin-table-cell admin-table-cell-right">
                    <div className="admin-ticket-actions">
                      {!ticket.escalated && ticket.status !== 'closed' && (
                        <button onClick={() => void escalate(ticket)} className="admin-btn-warning">Escalate</button>
                      )}
                      {ticket.status !== 'closed' && (
                        <button onClick={() => void close(ticket)} className="admin-btn-ghost">Close</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};


// Dashboard tab w/ counts + recent audit log
// as well as audit Log tab
const AuditLogTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (queryError) {
      if (/relation\s+"?audit_log"?\s+does not exist/i.test(queryError.message || '')) {
        setError('Audit log table missing. Run migrations to enable.');
      } else {
        setError('Failed to load logs: ' + queryError.message);
      }
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="admin-table-container">
      <div className="admin-tab-header">
        <p className="admin-tab-desc">Recent administrative actions and system events.</p>
        <button onClick={() => void load()} className="admin-table-refresh">Refresh</button>
      </div>

      {error && <div className="admin-warning">{error}</div>}

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">Action</th>
                <th className="admin-table-header">Actor</th>
                <th className="admin-table-header">Target</th>
                <th className="admin-table-header">Details</th>
                <th className="admin-table-header">Date</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={5} className="admin-table-loading">Loading audit logs...</td></tr>}
              {!loading && !error && rows.length === 0 && <tr><td colSpan={5} className="admin-table-empty">No logs found.</td></tr>}
              {!loading && rows.map(log => (
                <tr key={log.id} className="admin-table-row">
                  <td className="admin-table-cell">
                    <span className="admin-audit-action">{log.action}</span>
                  </td>
                  <td className="admin-table-cell">
                    <div className="admin-audit-actor-role">{log.actor_role}</div>
                    <div className="admin-audit-actor-id" title={log.actor_id}>{log.actor_id}</div>
                  </td>
                  <td className="admin-table-cell">
                    {log.target_type && (
                      <>
                        <div className="admin-audit-actor-role">{log.target_type}</div>
                        <div className="admin-audit-actor-id" title={log.target_id}>{log.target_id}</div>
                      </>
                    )}
                    {!log.target_type && '-'}
                  </td>
                  <td className="admin-table-cell admin-audit-details">
                    {log.details
                      ? Object.entries(log.details).map(([k, v]) => (
                          <div key={k}>
                            <span className="admin-audit-actor-role">{k}:</span>{' '}
                            {v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)
                              ? new Date(v).toLocaleString()
                              : String(v)}
                          </div>
                        ))
                      : '-'}
                  </td>
                  <td className="admin-table-cell admin-audit-date">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const DashboardTab = () => {
  const [stats, setStats] = useState({ users: 0, listings: 0, transactions: 0, openTickets: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      // Use only is_active for the listings count — cancelled/deleted/sold may not exist yet.
      const [usersC, listingsC, txC, ticketsC, audit, recentTx] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('transaction_date', sevenDaysAgo),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).neq('status', 'closed'),
        supabase.from('audit_log').select('id, actor_id, actor_role, action, target_type, target_id, created_at').order('created_at', { ascending: false }).limit(15),
        supabase.from('transactions').select('id, price, transaction_date, buyer_id, seller_id').order('transaction_date', { ascending: false }).limit(5),
      ]);
      setStats({
        users: usersC.count || 0,
        listings: listingsC.count || 0,
        transactions: txC.count || 0,
        openTickets: ticketsC.count || 0,
      });
      setRecent(audit.data || []);
      setLoading(false);
      // recentTx unused for now but available for future expansion
      void recentTx;
    };
    void load();
  }, []);

  return (
    <div className="admin-dashboard-container">
      <div className="admin-stats-grid">
        <Stat label="Users" value={loading ? '-' : stats.users} />
        <Stat label="Active Listings" value={loading ? '-' : stats.listings} />
        <Stat label="Sales (7d)" value={loading ? '-' : stats.transactions} />
        <Stat label="Open Tickets" value={loading ? '-' : stats.openTickets} />
      </div>

      <section className="admin-table-section">
        <div className="admin-activity-header">
          <h3 className="admin-activity-title">Recent admin/support activity</h3>
        </div>
        <div className="admin-activity-list">
          {loading && <div className="admin-table-loading">Loading...</div>}
          {!loading && recent.length === 0 && <div className="admin-table-loading">No activity yet.</div>}
          {!loading && recent.map(r => (
            <div key={r.id} className="admin-activity-row">
              <div className="admin-activity-row-top">
                <span className="admin-dashboard-action">{r.action}</span>
                <span className="admin-activity-time">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="admin-activity-meta">
                actor <span className="admin-activity-actor">{r.actor_id?.slice(0, 8)}</span>
                {r.actor_role && <span className="admin-activity-extra">({r.actor_role})</span>}
                {r.target_type && <span className="admin-activity-extra">-&gt; {r.target_type} <span className="admin-activity-actor">{r.target_id?.slice(0, 8)}</span></span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// Cards tab 
// adding/editing/deleting cards in the catalogue
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Secret Rare'];

const emptyForm = () => ({ name: '', description: '', rarity: 'Common', market_value: '' });

const CardsTab = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null); // null = creating new
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: e } = await supabase
      .from('cards')
      .select('id, name, description, rarity, market_value, is_archived')
      .order('name');
    if (e) { setError('Failed to load cards: ' + e.message); }
    else { setCards(data || []); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (card) => {
    setEditingId(card.id);
    setForm({
      name: card.name || '',
      description: card.description || '',
      rarity: card.rarity || 'Common',
      market_value: card.market_value != null ? String(card.market_value) : '',
    });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Card name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      rarity: form.rarity,
      market_value: form.market_value !== '' ? Number(form.market_value) : null,
    };

    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('cards').update(payload).eq('id', editingId));
    } else {
      ({ error: err } = await supabase.from('cards').insert({ id: crypto.randomUUID(), ...payload }));
    }

    if (err) {
      setError('Failed to save card: ' + err.message);
    } else {
      cancel();
      void load();
    }
    setSaving(false);
  };

  const deleteCard = async (id) => {
    if (!window.confirm('Archive this card? It will be hidden from users but transaction history is preserved.')) return;
    setDeletingId(id);
    const { error: err } = await supabase.from('cards').update({ is_archived: true }).eq('id', id);
    if (err) setError('Failed to archive: ' + err.message);
    else setCards(prev => prev.map(c => c.id === id ? { ...c, is_archived: true } : c));
    setDeletingId(null);
  };

  const unarchiveCard = async (id) => {
    setDeletingId(id);
    const { error: err } = await supabase.from('cards').update({ is_archived: false }).eq('id', id);
    if (err) setError('Failed to restore: ' + err.message);
    else setCards(prev => prev.map(c => c.id === id ? { ...c, is_archived: false } : c));
    setDeletingId(null);
  };

  const filtered = cards.filter(c => {
    if (!showArchived && c.is_archived) return false;
    if (!search.trim()) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="admin-table-container">
      <div className="admin-cards-controls">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="admin-cards-search"
        />
        <div className="admin-cards-controls-right">
          <label className="admin-cards-checkbox-label">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="admin-cards-checkbox"
            />
            Show archived
          </label>
          <button onClick={() => void load()} className="admin-table-refresh">Refresh</button>
          <button onClick={openNew} className="admin-cards-add-btn">+ Add Card</button>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* Add / Edit form */}
      {showForm && (
        <section className="admin-cards-form-section">
          <h3 className="admin-cards-form-title">{editingId ? 'Edit Card' : 'Add New Card'}</h3>
          <div className="admin-cards-form-grid">
            <div className="admin-cards-form-field">
              <label className="admin-cards-form-label">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Charizard"
                className="admin-cards-form-input"
              />
            </div>
            <div className="admin-cards-form-field">
              <label className="admin-cards-form-label">Rarity</label>
              <select
                value={form.rarity}
                onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                className="admin-cards-form-input"
              >
                {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="admin-cards-form-field">
              <label className="admin-cards-form-label">Market Value ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.market_value}
                onChange={e => setForm(f => ({ ...f, market_value: e.target.value }))}
                placeholder="e.g. 25.00"
                className="admin-cards-form-input"
              />
            </div>
            <div className="admin-cards-form-field">
              <label className="admin-cards-form-label">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional short description"
                className="admin-cards-form-input"
              />
            </div>
          </div>
          <div className="admin-cards-form-actions">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="admin-cards-save-btn"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Card'}
            </button>
            <button onClick={cancel} className="admin-cards-cancel-btn">
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="admin-table-section">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-header-row">
                <th className="admin-table-header">Name</th>
                <th className="admin-table-header">Rarity</th>
                <th className="admin-table-header">Market Value</th>
                <th className="admin-table-header">Description</th>
                <th className="admin-table-header admin-table-header-right">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {loading && <tr><td colSpan={5} className="admin-table-loading">Loading cards...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="admin-table-empty">No cards found.</td></tr>}
              {!loading && filtered.map(card => (
                <tr key={card.id} className={`admin-table-row${card.is_archived ? ' admin-cards-row-archived' : ''}`}>
                  <td className="admin-table-cell admin-cards-card-name">
                    {card.name}
                    {card.is_archived && <span className="admin-cards-archived-tag">Archived</span>}
                  </td>
                  <td className="admin-table-cell">
                    <span className={`admin-rarity-pill ${
                      card.rarity === 'Secret Rare' ? 'admin-rarity-pill-secret-rare' :
                      card.rarity === 'Holo Rare'   ? 'admin-rarity-pill-holo-rare' :
                      card.rarity === 'Rare'         ? 'admin-rarity-pill-rare' :
                      card.rarity === 'Uncommon'     ? 'admin-rarity-pill-uncommon' :
                      'admin-rarity-pill-common'
                    }`}>
                      {card.rarity || 'Unknown'}
                    </span>
                  </td>
                  <td className="admin-table-cell admin-cards-market-value">
                    {card.market_value != null ? `$${Number(card.market_value).toFixed(2)}` : <span className="admin-cards-market-empty">—</span>}
                  </td>
                  <td className="admin-table-cell admin-cards-description">{card.description || '—'}</td>
                  <td className="admin-table-cell admin-table-cell-right">
                    <div className="admin-ticket-actions">
                      <button onClick={() => openEdit(card)} className="admin-cards-edit-btn">Edit</button>
                      {card.is_archived ? (
                        <button
                          onClick={() => void unarchiveCard(card.id)}
                          disabled={deletingId === card.id}
                          className="admin-cards-restore-btn"
                        >
                          {deletingId === card.id ? '...' : 'Restore'}
                        </button>
                      ) : (
                      <button
                        onClick={() => void deleteCard(card.id)}
                        disabled={deletingId === card.id}
                        className="admin-cards-archive-btn"
                      >
                        {deletingId === card.id ? '...' : 'Archive'}
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Page Wrapper
const Admin = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState(null);

  const tab = params.get('tab') || 'users';
  const setTab = (t) => setParams({ tab: t });

  useEffect(() => {
    const check = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate('/'); return; }
      setUser(u);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', u.id)
        .single();
      if (roleError && roleError.code !== 'PGRST116') {
        setAuthChecked(true);
        return;
      }
      const r = roleData?.role || null;
      setRole(r);
      setAuthChecked(true);
      if (r !== 'admin' && r !== 'owner') {
        setTimeout(() => navigate('/home'), 1500);
      }
    };
    void check();
  }, [navigate]);

  const authorized = role === 'admin' || role === 'owner';

  if (!authChecked) {
    return <div className="admin-fullscreen-center">Loading...</div>;
  }
  if (!authorized) {
    return <div className="admin-fullscreen-center">Unauthorized: Admin/Owner only. Redirecting...</div>;
  }

  return (
    <div className="admin-container">
      <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen} />

      <main className="admin-main">
        <div>
          <h2 className="admin-title">Admin Console</h2>
          <p className="admin-subtitle">
            Signed in as <span className="admin-subtitle-role">{role}</span>.
            {role === 'admin' && ' Owners can additionally manage roles.'}
          </p>
        </div>

        <div className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`admin-tab-btn ${tab === t.id ? 'admin-tab-btn-active' : 'admin-tab-btn-inactive'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab viewer={user} viewerRole={role} />}
        {tab === 'online' && <OnlineUsersTab />}
        {tab === 'listings' && <ListingsTab viewer={user} viewerRole={role} />}
        {tab === 'cards' && <CardsTab />}
        {tab === 'reports' && <ReportsTab viewer={user} viewerRole={role} />}
        {tab === 'support' && <SupportRequestsTab viewer={user} viewerRole={role} />}
        {tab === 'audit' && <AuditLogTab />}
        {tab === 'dashboard' && <DashboardTab />}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={async () => {
          setIsAuthModalOpen(false);
          const { data: { user: u } } = await supabase.auth.getUser();
          setUser(u);
        }}
      />
    </div>
  );
};

export default Admin;
