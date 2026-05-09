import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { logAudit, notifyUser, notifyUsersWithRoles } from "@/lib/notify.js";


const sortOptions = [
  { value: "date", label: "Date" },
  { value: "type", label: "Type of Issue" },
];

const UserProfilePanel = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      const [{ data: userData, error: userErr }, { data: roleData }] = await Promise.all([
        supabase
          .from("users")
          .select("id, username, first_name, last_name, bio, avatar_url, created_at, status, status_until, status_reason")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (userErr) {
        setError("Failed to load profile.");
      } else {
        setProfile(userData);
        setRole(roleData?.role || null);
      }
      setLoading(false);
    };
    void fetchProfile();
  }, [userId]);

  const statusColor = (s) => {
    if (s === "banned") return "text-red-400";
    if (s === "suspended") return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="card" style={{marginTop: '1rem'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem'}}>
        <span className="support-label" style={{margin: 0}}>User Profile</span>
        <button onClick={onClose} className="support-sidebar-btn" style={{width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem'}}>Hide</button>
      </div>
      {loading && <p className="support-label">Loading profile...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!loading && !error && profile && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="profile-avatar-inner" style={{height: '2.5rem', width: '2.5rem'}} />
            ) : (
              <div className="profile-avatar-text" style={{height: '2.5rem', width: '2.5rem', fontSize: '0.875rem'}}>
                {(profile.username || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{fontWeight: 600}}>{profile.username || "(no username)"}</div>
              {(profile.first_name || profile.last_name) && (
                <div className="support-label" style={{margin: 0, textTransform: 'none'}}>{[profile.first_name, profile.last_name].filter(Boolean).join(" ")}</div>
              )}
            </div>
          </div>
          {profile.bio && <p className="support-label" style={{fontStyle: 'italic', textTransform: 'none'}}>{profile.bio}</p>}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem', fontSize: '0.75rem'}}>
            <div><span className="support-label" style={{display: 'inline', margin: 0}}>Role: </span>{role || "User"}</div>
            <div><span className="support-label" style={{display: 'inline', margin: 0}}>Status: </span><span className={statusColor(profile.status)} style={{fontWeight: 600}}>{profile.status || "active"}</span></div>
            {profile.status === "suspended" && profile.status_until && (
              <div style={{gridColumn: 'span 2'}}><span className="support-label" style={{display: 'inline', margin: 0}}>Suspended until: </span>{new Date(profile.status_until).toLocaleDateString()}</div>
            )}
            {profile.status_reason && (
              <div style={{gridColumn: 'span 2'}}><span className="support-label" style={{display: 'inline', margin: 0}}>Reason: </span>{profile.status_reason}</div>
            )}
            <div style={{gridColumn: 'span 2'}}><span className="support-label" style={{display: 'inline', margin: 0}}>Member since: </span>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</div>
            <div style={{gridColumn: 'span 2'}}><span className="support-label" style={{display: 'inline', margin: 0}}>User ID: </span><span style={{fontFamily: 'monospace', fontSize: '0.625rem'}}>{profile.id}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

const TicketDetail = ({
  ticket,
  user,
  profileUserId,
  setProfileUserId,
  showActionsDropdown,
  setShowActionsDropdown,
  pendingAction,
  setPendingAction,
  onConfirmAction,
  navigate,
}) => {
  if (!ticket) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 0'}}>
        <span className="support-ticketlist-title">No ticket selected</span>
        <span className="support-label" style={{marginTop: '0.5rem'}}>Click a ticket on the left to view details.</span>
      </div>
    );
  }

  const ticketId = typeof ticket.id === "string" ? ticket.id : String(ticket.id ?? "");
  const submittedBy = ticket.users?.username ?? "Unknown";
  // related_user_obj might come back as array or object depending on FK config
  const relatedUserObj = Array.isArray(ticket.related_user_obj)
    ? ticket.related_user_obj[0]
    : ticket.related_user_obj;
  // listings might come back as array or object
  const listingObj = Array.isArray(ticket.listings)
    ? ticket.listings[0]
    : ticket.listings;
  const cardName = listingObj?.cards?.name ?? null;
  const listingDisplay = cardName ?? ticket.related_listing ?? "N/A";

  // small fetch for references, if not acquired
  const [referencedListing, setReferencedListing] = useState(null);
  const [showListingBox, setShowListingBox] = useState(true);
  useEffect(() => {
    if (!ticket.related_listing) return;
    // If listingObj is present and has id, use it
    if (listingObj && listingObj.id) {
      setReferencedListing(listingObj);
      return;
    }
    // Otherwise fetch from supabase
    supabase
      .from("listings")
      .select("id, image_url, price, condition, seller_id, cards(name, rarity, market_value)")
      .eq("id", ticket.related_listing)
      .maybeSingle()
      .then(({ data }) => setReferencedListing(data));
  }, [ticket.related_listing, listingObj]);

  return (
    <>
      {/* Ticket header */}
      <div className="card" style={{marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center'}}>
          <span style={{fontSize: '1.125rem', fontWeight: 800}}>Ticket #{ticketId.slice(0, 8)}</span>
          <span className={ticket.status === "open" ? "support-ticketlist-status open" : "support-ticketlist-status closed"}>
            {ticket.status ?? "unknown"}
          </span>
          {ticket.issue_type && (
            <span className="support-ticketlist-type">{ticket.issue_type}</span>
          )}
          {ticket.escalated && (
            <span className="admin-status-badge-suspended">Escalated</span>
          )}
          {ticket.created_at && (
            <span className="support-label" style={{margin: 0, fontFamily: 'monospace', textTransform: 'none'}}>
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          )}
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 1.25rem', fontSize: '0.875rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.375rem'}}>
            <span className="support-label" style={{display: 'inline', margin: 0}}>By:</span>
            <span style={{fontWeight: 500}}>{submittedBy}</span>
            {ticket.user_id && (
              <>
                <button className="support-sidebar-btn" style={{width: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.75rem'}}
                  onClick={() => navigate("/support-messages", { state: { userId: ticket.user_id } })}>
                  Message
                </button>
                <button className="support-sidebar-btn" style={{width: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.75rem'}}
                  onClick={() => setProfileUserId(prev => prev === ticket.user_id ? null : ticket.user_id)}>
                  {profileUserId === ticket.user_id ? "Hide Profile" : "View Profile"}
                </button>
              </>
            )}
          </div>

          {ticket.related_user && <span style={{opacity: 0.2}}>|</span>}

          {ticket.related_user && (
            <div style={{display: 'flex', alignItems: 'center', gap: '0.375rem'}}>
              <span className="support-label" style={{display: 'inline', margin: 0}}>User:</span>
              <span style={{fontWeight: 500}}>{relatedUserObj?.username ?? ticket.related_user}</span>
              <button className="support-sidebar-btn" style={{width: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.75rem'}}
                onClick={() => navigate("/support-messages", { state: { userId: ticket.related_user } })}>
                Message
              </button>
              <button className="support-sidebar-btn" style={{width: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.75rem'}}
                onClick={() => setProfileUserId(prev => prev === ticket.related_user ? null : ticket.related_user)}>
                {profileUserId === ticket.related_user ? "Hide Profile" : "View Profile"}
              </button>
            </div>
          )}

          {ticket.related_listing && <span style={{opacity: 0.2}}>|</span>}

          {ticket.related_listing && (
            <div style={{display: 'flex', alignItems: 'center', gap: '0.375rem'}}>
              <span className="support-label" style={{display: 'inline', margin: 0}}>Listing:</span>
              <button className="support-sidebar-btn" style={{width: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.75rem', textDecoration: 'underline'}}
                onClick={() => setShowListingBox(v => !v)}>
                {showListingBox ? 'Hide Listing' : 'View Listing'}
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="support-label" style={{display: 'inline', margin: 0}}>Description: </span>
          <span style={{whiteSpace: 'pre-line'}}>{ticket.description ?? "(no description)"}</span>
        </div>

        {referencedListing && showListingBox && (
          <div className="card" style={{display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem'}}>
            <img
              src={referencedListing.image_url || '/placeholder-card.png'}
              alt={referencedListing.cards?.name || 'Listing'}
              className="userprofile-listing-img"
              style={{width: '5rem', height: '7rem'}}
            />
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, fontSize: '0.75rem'}}>
              <div style={{fontWeight: 700}}>{referencedListing.cards?.name || 'Listing #' + referencedListing.id}</div>
              <div className="support-label" style={{margin: 0}}>{referencedListing.cards?.rarity}</div>
              <div className="support-label" style={{margin: 0, textTransform: 'none'}}>Owned by: {referencedListing.users?.username || referencedListing.seller_id}</div>
              <div>Condition: <span style={{fontWeight: 600}}>{referencedListing.condition}</span></div>
              <div style={{fontWeight: 700}}>${Number(referencedListing.price).toFixed(2)}</div>
              {referencedListing.cards?.market_value != null && (
                <div className="support-label" style={{margin: 0, textTransform: 'none'}}>
                  Market: ${Number(referencedListing.cards.market_value).toFixed(2)}
                  {Number(referencedListing.price) > Number(referencedListing.cards.market_value) && (
                    <span> +${(Number(referencedListing.price) - Number(referencedListing.cards.market_value)).toFixed(2)}</span>
                  )}
                  {Number(referencedListing.price) < Number(referencedListing.cards.market_value) && (
                    <span> -${(Number(referencedListing.cards.market_value) - Number(referencedListing.price)).toFixed(2)}</span>
                  )}
                  {Number(referencedListing.price) === Number(referencedListing.cards.market_value) && (
                    <span> at market</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {profileUserId && (
          <UserProfilePanel userId={profileUserId} onClose={() => setProfileUserId(null)} />
        )}
      </div>

      {/* Actions */}
      {ticket.status === "open" && (
        <div style={{marginBottom: '1.5rem'}}>
          <span className="support-label">Actions</span>
          <div style={{position: 'relative', display: 'inline-block'}}>
            <button className="support-sidebar-btn" onClick={() => setShowActionsDropdown(v => !v)}
              style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}>
              Select Action
              <svg style={{width: '1.25rem', height: '1.25rem'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.584l3.71-3.354a.75.75 0 111.02 1.1l-4.25 3.84a.75.75 0 01-1.02 0l-4.25-3.84a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {showActionsDropdown && (
              <div className="card" style={{position: 'absolute', left: 0, marginTop: '0.5rem', width: '14rem', zIndex: 10, padding: '0.25rem 0'}}>
                <button className="support-sidebar-btn" style={{borderRadius: 0, border: 'none'}}
                  onClick={() => { setPendingAction("Escalate"); setShowActionsDropdown(false); }}
                  disabled={!!ticket.escalated}>
                  {ticket.escalated ? "Already Escalated" : "Escalate to Admin"}
                </button>
                <button className="support-sidebar-btn" style={{borderRadius: 0, border: 'none'}}
                  onClick={() => { setPendingAction("Close Ticket"); setShowActionsDropdown(false); }}>
                  Close Ticket
                </button>
                {ticket.related_listing && (
                  <button className="support-sidebar-btn support-signout-btn" style={{borderRadius: 0, border: 'none'}}
                    onClick={() => { setPendingAction("Remove Listing"); setShowActionsDropdown(false); }}>
                    Remove Related Listing
                  </button>
                )}
              </div>
            )}
          </div>

          {pendingAction && (
            <div className="card" style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <div style={{fontWeight: 600}}>Confirm: {pendingAction}?</div>
              <div style={{display: 'flex', gap: '0.75rem'}}>
                <button onClick={() => void onConfirmAction()} className="btn btn-blue">Confirm</button>
                <button onClick={() => setPendingAction(null)} className="support-sidebar-btn" style={{width: 'auto'}}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default function Support() {
  const location = useLocation();
  const prefill = location.state || {};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(!!prefill.listingId);
  const [newTicket, setNewTicket] = useState({
    issue_type: "",
    description: "",
    related_listing: prefill.listingId || "",
    related_user: prefill.sellerId || "",
  });
  const [showClosed, setShowClosed] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const navigate = useNavigate();
  //Select statement, pulled from supa.
  const TICKET_SELECT = `id,description,issue_type,status,created_at,escalated,user_id,related_listing,related_user,users:user_id(username)`;

  const handleEscalateTicket = async (ticketId) => {
    await supabase.from("support_tickets").update({ escalated: true }).eq("id", ticketId);
    setTickets(ts => ts.map(t => t.id === ticketId ? { ...t, escalated: true } : t));
    setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, escalated: true } : prev);
    if (user) {
      await logAudit({ actorId: user.id, actorRole: "support", action: "ticket.escalate", targetType: "ticket", targetId: ticketId });
      await notifyUsersWithRoles({ roles: ["admin", "owner"], type: "ticket_escalated", title: "Support escalated a ticket", body: `Ticket ${ticketId.slice(0, 8)} needs admin review.`, link: "/admin?tab=support" });
    }
  };

  const handleDisregardTicket = async (ticketId) => {
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
    if (user) await logAudit({ actorId: user.id, actorRole: "support", action: "ticket.close", targetType: "ticket", targetId: ticketId });
    setTickets(ts => ts.filter(t => t.id !== ticketId));
    setSelectedTicket(null);
    setProfileUserId(null);
  };

  const handleRemoveListing = async (ticket) => {
    const listingId = ticket?.related_listing;
    if (!listingId) { alert("No related listing to remove."); return; }
    const reason = window.prompt("Reason for removing this listing?") || "Removed by support";
    const { data: listing } = await supabase.from("listings").select("seller_id").eq("id", listingId).maybeSingle();
    const { error: delErr } = await supabase.from("listings").update({ is_active: false }).eq("id", listingId);
    if (delErr) { alert(`Error: ${delErr.message}`); return; }
    if (user) {
      await logAudit({ actorId: user.id, actorRole: "support", action: "listing.remove", targetType: "listing", targetId: listingId, details: { reason, ticket_id: ticket.id } });
    }
    const sellerId = listing?.seller_id || ticket.related_user;
    if (sellerId) await notifyUser({ userId: sellerId, type: "listing_removed", title: "Your listing was removed", body: `Support removed a listing tied to ticket #${ticket.id?.slice(0, 8)}. Reason: ${reason}` });
  };

  useEffect(() => {
    const checkAuthAndRole = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/"); return; }
      const { data: roleData, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", u.id).single();
      if (roleError || !roleData || roleData.role !== "support") {
        setError("Unauthorized: Support access only.");
        setLoading(false);
        setTimeout(() => navigate("/"), 2000);
        return;
      }
      setUser(u);
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select(TICKET_SELECT)
        .order("created_at", { ascending: false });
      if (ticketsError) { setError("Failed to load tickets: " + ticketsError.message); setLoading(false); return; }
      setTickets(ticketsData || []);
      setLoading(false);
    };
    checkAuthAndRole();
  }, [navigate]);

  if (loading) {
    return (
      <div className="support-container" style={{alignItems: 'center', justifyContent: 'center'}}>
        <p className="support-label">Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="support-container" style={{alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  const handleNewTicketChange = (e) => setNewTicket(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmitNewTicket = async (e) => {
    e.preventDefault();
    const { error: insErr } = await supabase.from("support_tickets").insert([{
      issue_type: newTicket.issue_type,
      description: newTicket.description,
      related_listing: newTicket.related_listing || null,
      related_user: newTicket.related_user || null,
      user_id: user.id,
      status: "open",
    }]);
    if (!insErr) {
      setShowNewTicket(false);
      setNewTicket({ issue_type: "", description: "", related_listing: "", related_user: "" });
      const { data: refreshed } = await supabase.from("support_tickets").select(TICKET_SELECT).order("created_at", { ascending: false });
      setTickets(refreshed || []);
    } else {
      alert("Failed to submit ticket: " + insErr.message);
    }
  };

  const filteredTickets = tickets
    .filter(t => t.status !== "closed")
    .filter(t => {
      const s = search.toLowerCase();
      return (
        (t.users?.username || "").toLowerCase().includes(s) ||
        (t.issue_type || "").toLowerCase().includes(s) ||
        (t.description || "").toLowerCase().includes(s)
      );
    })
    .sort((a, b) =>
      sortBy === "type"
        ? (a.issue_type || "").localeCompare(b.issue_type || "")
        : new Date(b.created_at) - new Date(a.created_at)
    );

  const closedTickets = tickets
    .filter(t => t.status === "closed")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const visibleTickets = showClosed ? closedTickets : filteredTickets;

  const confirmAction = async () => {
    if (!selectedTicket || !pendingAction) return;
    if (pendingAction === "Escalate") await handleEscalateTicket(selectedTicket.id);
    else if (pendingAction === "Close Ticket") await handleDisregardTicket(selectedTicket.id);
    else if (pendingAction === "Remove Listing") await handleRemoveListing(selectedTicket);
    setPendingAction(null);
  };

  return (
    <div className="support-container">
      <aside className="support-sidebar">
        <div className="support-logo"><img src="/assets/TransWhiteFlare.png" alt="Flare" /></div>
        <div className="support-sort">
          <label className="support-label">Sort by</label>
          <select className="support-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="support-search">
          <label className="support-label">Search</label>
          <input className="support-input" type="text" placeholder="User, type, keyword..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="support-sidebar-actions">
          <button onClick={() => navigate("/")} className="support-sidebar-btn">Home</button>
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="support-sidebar-btn support-signout-btn">Sign Out</button>
        </div>
      </aside>
      <div className="support-ticketlist">
        <div className="support-ticketlist-header">
          <h1 className="support-ticketlist-title">Tickets</h1>
          <button className="support-ticketlist-toggle" onClick={() => setShowClosed(v => !v)}>{showClosed ? "Show Open" : "Show Closed"}</button>
        </div>
        <div className="support-ticketlist-list">
          {visibleTickets.length === 0 ? (
            <div className="support-ticketlist-empty">No {showClosed ? "closed" : "open"} tickets.</div>
          ) : (
            visibleTickets.map(ticket => {
              const userName = ticket.users?.username || "Unknown";
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  className={`support-ticketlist-item${isSelected ? " selected" : ""}`}
                  onClick={() => {
                    setSelectedTicket(isSelected ? null : ticket);
                    setProfileUserId(null);
                    setPendingAction(null);
                    setShowActionsDropdown(false);
                    setShowNewTicket(false);
                  }}
                >
                  {isSelected && <span className="support-ticketlist-selectedbar" />}
                  <div className="support-ticketlist-userrow">
                    <div className={`support-ticketlist-usericon${ticket.status === "closed" ? " closed" : ""}`}>{userName[0].toUpperCase()}</div>
                    <span className="support-ticketlist-username">{userName}</span>
                    <span className={`support-ticketlist-status${ticket.status === "open" ? " open" : " closed"}`}>{ticket.status}</span>
                  </div>
                  <div className="support-ticketlist-meta">
                    <span className={`support-ticketlist-type${ticket.status === "closed" ? " closed" : ""}`}>{ticket.issue_type || "General"}</span>
                    <span className="support-ticketlist-date">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="support-ticketlist-desc">{ticket.description}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="support-detailpanel">
        <div className="support-detailpanel-inner">
          {showNewTicket ? (
            <form className="support-newticket-form" onSubmit={handleSubmitNewTicket}>
              <h2 className="support-newticket-title">Submit a Support Ticket</h2>
              <div>
                <label className="support-label">Issue Type</label>
                <input name="issue_type" value={newTicket.issue_type} onChange={handleNewTicketChange} className="support-input" placeholder="e.g. Report Listing, Payment Issue, etc." required />
              </div>
              <div>
                <label className="support-label">Description</label>
                <textarea name="description" value={newTicket.description} onChange={handleNewTicketChange} className="support-input" rows={4} placeholder="Describe your issue..." required />
              </div>
              <div className="support-newticket-row">
                <div className="support-newticket-col">
                  <label className="support-label">Related Listing</label>
                  <input name="related_listing" value={newTicket.related_listing} onChange={handleNewTicketChange} className="support-input" placeholder="Listing ID" readOnly={!!prefill.listingId} />
                </div>
                <div className="support-newticket-col">
                  <label className="support-label">Related User</label>
                  <input name="related_user" value={newTicket.related_user} onChange={handleNewTicketChange} className="support-input" placeholder="User ID" readOnly={!!prefill.sellerId} />
                </div>
              </div>
              <div className="support-newticket-actions">
                <button type="submit" className="support-newticket-submit">Submit Ticket</button>
                <button type="button" className="support-newticket-cancel" onClick={() => setShowNewTicket(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <TicketDetail
              ticket={selectedTicket}
              user={user}
              profileUserId={profileUserId}
              setProfileUserId={setProfileUserId}
              showActionsDropdown={showActionsDropdown}
              setShowActionsDropdown={setShowActionsDropdown}
              pendingAction={pendingAction}
              setPendingAction={setPendingAction}
              onConfirmAction={confirmAction}
              navigate={navigate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
