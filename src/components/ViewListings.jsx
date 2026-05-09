import React, { useState } from 'react';

const ViewListings = ({ listing, user, onClose, onReport, onBid, onBuyNow, onContact, requireSignIn }) => {
  const [showBidInput, setShowBidInput] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [buyError, setBuyError] = useState('');

  if (!listing) return null;

  const isOwner = user && listing.seller_id === user.id;
  const listingPrice = Number(listing.price || 0);
  const marketValue = Number(listing.cards?.market_value || 0);

  const handleAction = (action) => {
    if (!user && requireSignIn) {
      requireSignIn();
      return;
    }
    action();
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    const bid = Number.parseFloat(bidAmount);
    if (Number.isNaN(bid) || bid <= 0) {
      setBidError('Enter a valid bid amount.');
      return;
    }
    setBidError('');
    setSubmittingBid(true);
    try {
      await handleAction(() => onBid(bid));
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{ maxHeight: '90vh', width: '100%', maxWidth: '28rem', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div className="font-extrabold" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.02em' }}>
              {listing.cards?.name}
            </div>
            <div className="admin-listing-meta" style={{ marginTop: '0.25rem' }}>
              {listing.cards?.rarity || 'Unknown rarity'} — {listing.condition || 'Unknown condition'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="admin-btn-ghost"
            aria-label="Close listing details"
            style={{ flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Card image */}
        <img
          src={listing.image_url || '/placeholder-card.png'}
          alt={listing.cards?.name || 'Card listing'}
          style={{
            display: 'block', width: '100%', height: '16rem',
            objectFit: 'contain', borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.3)', marginBottom: '1rem'
          }}
        />

        {/* Pricing info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
          <div className="text-sm" style={{ color: '#9ca3af' }}>
            Price:{' '}
            <span className="wallet-table-market font-extrabold" style={{ fontSize: '1.125rem' }}>
              ${listingPrice.toFixed(2)}
            </span>
          </div>

          {listing.cards?.market_value != null && (
            <div className="text-xs" style={{ color: '#6b7280' }}>
              Market value:{' '}
              <span className="wallet-table-total font-semibold">${marketValue.toFixed(2)}</span>
              {listingPrice > marketValue && (
                <span style={{ marginLeft: '0.5rem', color: '#fbbf24' }}>
                  ${(listingPrice - marketValue).toFixed(2)} above market
                </span>
              )}
              {listingPrice < marketValue && (
                <span style={{ marginLeft: '0.5rem', color: '#34d399' }}>
                  ${(marketValue - listingPrice).toFixed(2)} below market
                </span>
              )}
            </div>
          )}

          <div className="admin-listing-meta">{listing.views || 0} views</div>
          <div className="text-sm" style={{ color: '#9ca3af' }}>
            Seller:{' '}
            <span style={{ color: '#d1d5db', fontWeight: 600 }}>
              {listing.users?.username || listing.seller_id}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn btn-blue"
              disabled={buyingNow}
              style={{ width: '100%', opacity: buyingNow ? 0.5 : 1 }}
              onClick={async () => {
                if (!user && requireSignIn) { requireSignIn(); return; }
                if (!window.confirm(`Buy "${listing.cards?.name}" for $${listingPrice.toFixed(2)}?`)) return;
                setBuyingNow(true);
                setBuyError('');
                try {
                  await onBuyNow();
                } catch (err) {
                  setBuyError(err?.message || 'Purchase failed. Please try again.');
                } finally {
                  setBuyingNow(false);
                }
              }}
            >
              {buyingNow ? 'Processing…' : `Buy Now — $${listingPrice.toFixed(2)}`}
            </button>

            {buyError && <div className="alert-error" style={{ marginBottom: 0 }}>{buyError}</div>}

            <button
              className="admin-btn-ghost"
              style={{ width: '100%', padding: '0.625rem 1rem', fontSize: '0.95rem' }}
              onClick={() => handleAction(onContact)}
            >
              Contact Seller
            </button>

            <button
              className="btn btn-emerald"
              style={{ width: '100%' }}
              onClick={() => setShowBidInput((v) => !v)}
            >
              Place a Bid
            </button>

            <button
              className="btn btn-red"
              style={{ width: '100%' }}
              onClick={() => handleAction(onReport)}
            >
              Report Listing
            </button>

            {showBidInput && (
              <form className="card" style={{ background: '#0d1117' }} onSubmit={handleBidSubmit}>
                <label className="support-label">Your Bid (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="support-input"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter amount"
                  autoFocus
                  style={{ marginBottom: '0.5rem' }}
                />
                {bidError && <div className="alert-error">{bidError}</div>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-emerald"
                    disabled={submittingBid}
                    style={{ flex: 1, opacity: submittingBid ? 0.5 : 1 }}
                  >
                    {submittingBid ? 'Sending…' : 'Send Bid'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    style={{ flex: 1, padding: '0.625rem 1rem', fontSize: '0.95rem' }}
                    onClick={() => { setShowBidInput(false); setBidAmount(''); setBidError(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {isOwner && (
          <div className="admin-listing-meta" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            This is your listing.
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewListings;
