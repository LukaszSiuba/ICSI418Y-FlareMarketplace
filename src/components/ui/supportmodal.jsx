import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { notifyUsersWithRoles } from "@/lib/notify.js";

const ISSUE_TYPES = [
  { value: "listing", label: "Listing Related Issue" },
  { value: "bug", label: "Bug" },
  { value: "scam", label: "Scam" },
  { value: "report_user", label: "Report User" },
];

export default function SupportModal({ isOpen, onClose, user, defaultRelatedListing = "", defaultRelatedUser = "" }) {
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0].value);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [relatedListing, setRelatedListing] = useState(defaultRelatedListing);
  const [relatedUser, setRelatedUser] = useState(defaultRelatedUser);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // set relatedListing and relatedUser to defaults when model opens
  useEffect(() => {
    if (isOpen) {
      setRelatedListing(defaultRelatedListing);
      setRelatedUser(defaultRelatedUser);
    }
  }, [isOpen, defaultRelatedListing, defaultRelatedUser]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, username");
      setUsers(data || []);
    };
    fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchListings = async () => {
      let sellerIds = [user?.id].filter(Boolean);
      if (relatedUser && relatedUser !== user?.id) sellerIds.push(relatedUser);
      if (sellerIds.length === 0) {
        setListings([]);
        return;
      }
      const { data } = await supabase
        .from("listings")
        .select("id, cards(name), seller_id")
        .in("seller_id", sellerIds);
      setListings(data || []);
    };
    fetchListings();
  }, [isOpen, user, relatedUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!description.trim()) {
      alert("Please enter a support ticket description.");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      issue_type: issueType,
      description: description.trim(),
      related_listing: relatedListing || null,
      related_user: relatedUser || null,
      status: 'open'
    });

    setSubmitting(false);
    if (!error) {
      setSuccess(true);
      setDescription("");
      setRelatedListing("");
      setRelatedUser("");
      setIssueType(ISSUE_TYPES[0].value);
      await notifyUsersWithRoles({
        roles: ['support', 'admin', 'owner'],
        type: 'support_ticket',
        title: 'New support ticket',
        body: `${issueType}: ${description.trim().slice(0, 120)}`,
        link: '/support'
      });
      setTimeout(onClose, 1500);
    } else {
      alert("Failed to submit ticket: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-white/10 rounded-xl p-8 w-full max-w-lg relative text-gray-200">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl font-bold"
          onClick={onClose}
        >
          X
        </button>
        <h2 className="text-2xl font-extrabold mb-6 text-white tracking-tight">Submit a Support Ticket</h2>
        {success ? (
          <div className="text-emerald-400 font-bold text-center py-8">Ticket submitted!</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Issue Type</label>
              <select
                className="w-full bg-[#0d1117] border border-white/10 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={issueType}
                onChange={e => setIssueType(e.target.value)}
                required
              >
                {ISSUE_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                className="w-full bg-[#0d1117] border border-white/10 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Related User</label>
              <select
                className="w-full bg-[#0d1117] border border-white/10 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={relatedUser}
                onChange={e => setRelatedUser(e.target.value)}
              >
                <option value="">None</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username || u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500 uppercase tracking-wider">Related Listing</label>
              <select
                className="w-full bg-[#0d1117] border border-white/10 text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={relatedListing}
                onChange={e => setRelatedListing(e.target.value)}
              >
                <option value="">None</option>
                {listings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.cards?.name || listing.id}
                    {listing.seller_id === user?.id ? " (yours)" : " (related user)"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
