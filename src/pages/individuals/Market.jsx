import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import Navbar from '@/components/ui/navbar.jsx';
import AuthModal from '../../log/forms/authmodal.jsx';

const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Secret Rare'];

const rarityBadgeClass = (rarity) => {
  switch (rarity) {
    case 'Secret Rare': return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
    case 'Holo Rare':   return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'Rare':        return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
    case 'Uncommon':    return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    default:            return 'bg-white/5 text-gray-400 border border-white/10';
  }
};

//Just the change badge for market vs listing price, used in the Market page. Shows rate of card listing and what it is compared to market value
const priceDeltaBadge = (listPrice, marketValue) => {
  if (listPrice == null || marketValue == null || Number(marketValue) === 0) return null;
  const diff = Number(listPrice) - Number(marketValue);
  const pct = Math.round((diff / Number(marketValue)) * 100);
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-gray-500">at market</span>;
  if (diff > 0) return <span className="text-xs text-amber-400">+{pct}% above market</span>;
  return <span className="text-xs text-emerald-400">{pct}% below market</span>;
};

const Market = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      await fetchMarketData();
    };
    void init();
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    setError('');

    // Try with market_value; fall back if the column doesn't exist yet.
    let { data: cardRows, error: cardErr } = await supabase
      .from('cards')
      .select('id, name, rarity, market_value, description')
      .eq('is_archived', false)
      .order('name');

    if (cardErr && /market_value/i.test(cardErr.message || '')) {
      const fallback = await supabase
        .from('cards')
        .select('id, name, rarity, description')
        .eq('is_archived', false)
        .order('name');
      cardRows = fallback.data;
      cardErr = fallback.error;
    }

    if (cardErr) {
      setError('Failed to load market data. Please try again later.');
      setLoading(false);
      return;
    }

    // Only filter by is_active — cancelled/deleted columns may not exist yet.
    const { data: listingRows } = await supabase
      .from('listings')
      .select('card_id, price')
      .eq('is_active', true);

    const lowestAsk = new Map();
    (listingRows || []).forEach(l => {
      const p = Number(l.price);
      if (!lowestAsk.has(l.card_id) || p < lowestAsk.get(l.card_id)) {
        lowestAsk.set(l.card_id, p);
      }
    });

    const enriched = (cardRows || []).map(c => ({
      ...c,
      lowest_price: lowestAsk.has(c.id) ? lowestAsk.get(c.id) : null,
    }));

    setCards(enriched);
    setLoading(false);
  };

  const trimmed = search.trim().toLowerCase();
  const filtered = cards
    .filter(c => {
      if (rarityFilter !== 'All' && c.rarity !== rarityFilter) return false;
      if (trimmed && !(c.name || '').toLowerCase().includes(trimmed)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'market_value') return (Number(b.market_value) || 0) - (Number(a.market_value) || 0);
      if (sortBy === 'lowest_price') {
        if (a.lowest_price == null && b.lowest_price == null) return 0;
        if (a.lowest_price == null) return 1;
        if (b.lowest_price == null) return -1;
        return a.lowest_price - b.lowest_price;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

  const rarities = ['All', ...rarityOrder];

  return (
    <div className="app-container">
      <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen} />

      <main className="main-content">
        <div>
          <h2 className="results-title">Market Prices</h2>
          <p className="hero-subtitle" style={{textAlign: 'left', margin: 0}}>
            Reference market values alongside the current lowest active listing price so you always know if a deal is fair.
          </p>
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by card name..."
            className="support-input"
            style={{flex: 1, minWidth: '12rem'}}
          />
          <select
            value={rarityFilter}
            onChange={e => setRarityFilter(e.target.value)}
            className="support-select"
            style={{width: 'auto'}}
          >
            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="support-select"
            style={{width: 'auto'}}
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="market_value">Sort: Market Value (high–low)</option>
            <option value="lowest_price">Sort: Lowest Listing (low–high)</option>
          </select>
          <button onClick={() => void fetchMarketData()} className="support-sidebar-btn" style={{width: 'auto'}}>
            Refresh
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <section className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{overflowX: 'auto'}}>
            <table className="wallet-table">
              <thead>
                <tr className="wallet-table-header-row">
                  <th className="wallet-table-header">Card</th>
                  <th className="wallet-table-header">Rarity</th>
                  <th className="wallet-table-header">Market Value</th>
                  <th className="wallet-table-header">Lowest Active Listing</th>
                  <th className="wallet-table-header">vs. Market</th>
                </tr>
              </thead>
              <tbody className="wallet-table-body">
                {loading && (
                  <tr><td colSpan={5} className="wallet-table-loading">Loading market data...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="wallet-table-empty">No cards match your filters.</td></tr>
                )}
                {!loading && filtered.map(card => (
                  <tr key={card.id} className="wallet-table-row">
                    <td className="wallet-table-cell">
                      <div style={{fontWeight: 600}}>{card.name}</div>
                      {card.description && (
                        <div className="support-label" style={{margin: 0, textTransform: 'none', maxWidth: '16rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{card.description}</div>
                      )}
                    </td>
                    <td className="wallet-table-cell">
                      <span className={`wallet-table-rarity ${rarityBadgeClass(card.rarity)}`}>
                        {card.rarity || 'Unknown'}
                      </span>
                    </td>
                    <td className="wallet-table-cell wallet-table-market">
                      {card.market_value != null ? (
                        <span className="wallet-table-total">${Number(card.market_value).toFixed(2)}</span>
                      ) : (
                        <span className="support-label" style={{margin: 0, fontStyle: 'italic'}}>No data</span>
                      )}
                    </td>
                    <td className="wallet-table-cell">
                      {card.lowest_price != null ? (
                        <span className="wallet-table-market">${card.lowest_price.toFixed(2)}</span>
                      ) : (
                        <span className="support-label" style={{margin: 0, fontStyle: 'italic'}}>No listings</span>
                      )}
                    </td>
                    <td className="wallet-table-cell">
                      {priceDeltaBadge(card.lowest_price, card.market_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="support-label" style={{textAlign: 'center'}}>Market Values Are Not Accurate.</p>
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

export default Market;
