import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Navbar from '@/components/ui/navbar.jsx';
import AuthModal from '@/log/forms/authmodal.jsx';
import { ReviewsList, LeaveReviewForm } from '@/components/ui/reviews.jsx';
import '../../global.css';

// /user/:id public profile page anyone can view.
// Shows the user's bio + listings + reviews. If the viewer has a completed
// transaction with this user as buyer they can leave a review.
const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [reviewableTxs, setReviewableTxs] = useState([]); // {id} of transactions where viewer = buyer & no review yet
  const [loading, setLoading] = useState(true);
  const [reviewKey, setReviewKey] = useState(0); // bumped to refresh ReviewsList after submit

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setViewer(u);

      const { data: profileData } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, bio, avatar_url, created_at, status')
        .eq('id', id)
        .maybeSingle();
      setProfile(profileData);

      let listingsQuery = supabase
        .from('listings')
        .select('id, price, condition, image_url, cards(name, rarity, market_value)')
        .eq('seller_id', id)
        .eq('is_active', true);

      // Try adding new filters
      const { data: listingsData, error: listingsError } = await listingsQuery
        .eq('cancelled', false)
        .eq('sold', false)
        .is('deleted', null)
        .order('created_at', { ascending: false });

      if (listingsError && /column\s+listings\.(cancelled|sold|deleted)\s+does not exist/i.test(listingsError.message || '')) {
        // Fallback for legacy schema
        const { data: legacyListings } = await supabase
          .from('listings')
          .select('id, price, condition, image_url, cards(name, rarity, market_value)')
          .eq('seller_id', id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        setActiveListings(legacyListings || []);
      } else {
        setActiveListings(listingsData || []);
      }

      // Pull transactions where viewer was the buyer and seller is this user
      if (u && u.id !== id) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('id')
          .eq('buyer_id', u.id)
          .eq('seller_id', id);
        const txIds = (txs || []).map(t => t.id);
        if (txIds.length) {
          const { data: existing } = await supabase
            .from('reviews')
            .select('transaction_id')
            .in('transaction_id', txIds)
            .eq('reviewer_id', u.id);
          const reviewed = new Set((existing || []).map(r => r.transaction_id));
          setReviewableTxs(txIds.filter(t => !reviewed.has(t)));
        }
      }

      setLoading(false);
    };
    void init();
  }, [id]);

  if (loading) {
    return (
      <div className="profile-loading">Loading profile...</div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <Navbar user={viewer} setUser={setViewer} setIsAuthModalOpen={setIsAuthModalOpen} />
        <main className="profile-main userprofile-main-notfound">
          <p className="userprofile-notfound-text">User not found.</p>
        </main>
      </div>
    );
  }

  const isSelf = viewer && viewer.id === profile.id;

  return (
    <div className="profile-container userprofile-container">
      <Navbar user={viewer} setUser={setViewer} setIsAuthModalOpen={setIsAuthModalOpen} />

      <main className="profile-main userprofile-main">
        {/* Profile Card */}
        <section className="profile-card userprofile-card">
          <div className="profile-banner userprofile-banner">
            <div className="profile-banner-radial userprofile-banner-radial" />
          </div>
          <div className="profile-content userprofile-content">
            <div className="profile-avatar-outer userprofile-avatar-outer">
              <div className="profile-avatar-inner userprofile-avatar-inner">
                <div className="profile-avatar-text userprofile-avatar-text">
                  {(profile.first_name || profile.username || '?').charAt(0)}
                </div>
              </div>
            </div>
            <div className="profile-header-row userprofile-header-row">
              <div>
                <h2 className="profile-name userprofile-name">
                  {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Collector'}
                </h2>
                <p className="profile-username userprofile-username">@{profile.username || 'user'}</p>
                {profile.status && profile.status !== 'active' && (
                  <span className="userprofile-status-badge">
                    {profile.status}
                  </span>
                )}
              </div>
              {!isSelf && viewer && (
                <button
                  onClick={() => navigate('/messages', { state: { userId: profile.id, username: profile.username } })}
                  className="userprofile-message-btn"
                >
                  Message
                </button>
              )}
            </div>
            <div className="profile-bio-section userprofile-bio-section">
              <h3 className="profile-bio-label userprofile-bio-label">Bio</h3>
              <p className="profile-bio-text userprofile-bio-text">{profile.bio || 'No bio added yet.'}</p>
            </div>
          </div>
        </section>

        {/* Active listings by this user */}
        <section className="userprofile-listings-card">
          <h3 className="userprofile-listings-title">Active Listings</h3>
          {activeListings.length === 0 ? (
            <p className="userprofile-listings-empty">No active listings.</p>
          ) : (
            <div className="userprofile-listings-grid">
              {activeListings.map(l => (
                <div key={l.id} className="userprofile-listing-item">
                  <img
                    src={l.image_url || '/placeholder-card.png'}
                    alt={l.cards?.name}
                    className="userprofile-listing-img"
                  />
                  <div className="userprofile-listing-info">
                    <div className="userprofile-listing-name">{l.cards?.name}</div>
                    <div className="userprofile-listing-meta">{l.condition} - {l.cards?.rarity}</div>
                  </div>
                  <div className="userprofile-listing-price">${Number(l.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leave a review (only if eligible) */}
        {!isSelf && reviewableTxs.length > 0 && (
          <section className="userprofile-review-card">
            <h3 className="userprofile-review-title">Leave a Review</h3>
            <LeaveReviewForm
              viewer={viewer}
              revieweeId={profile.id}
              transactionId={reviewableTxs[0]}
              onSubmitted={() => {
                setReviewableTxs(t => t.slice(1));
                setReviewKey(k => k + 1);
              }}
            />
          </section>
        )}

        {/* Reviews of this user */}
        <section className="userprofile-reviews-card">
          <h3 className="userprofile-reviews-title">Reviews</h3>
          <ReviewsList key={reviewKey} userId={profile.id} />
        </section>
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={async () => {
          setIsAuthModalOpen(false);
          const { data: { user: u } } = await supabase.auth.getUser();
          setViewer(u);
        }}
      />
    </div>
  );
};

export default UserProfile;
