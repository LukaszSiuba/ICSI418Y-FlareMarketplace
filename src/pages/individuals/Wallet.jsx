import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Navbar from '@/components/ui/navbar.jsx';
import AuthModal from '@/log/forms/authmodal.jsx';

//shows cards the user has purchased from completed transactions
const Wallet = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        navigate('/');
        return;
      }
      setUser(u);

      // Pull all completed purchases for this user
      const { data, error: txErr } = await supabase
        .from('transactions')
        .select('id, price, card_id, cards(id, name, rarity, market_value)')
        .eq('buyer_id', u.id)
        .eq('status', 'completed');

      if (txErr) {
        setError('Could not load wallet. Please try again later.');
        setLoading(false);
        return;
      }

      // Group by card so each row shows quantity + total value
      const byCard = new Map();
      (data || []).forEach(tx => {
        const card = tx.cards;
        if (!card) return;
        if (byCard.has(card.id)) {
          byCard.get(card.id).quantity += 1;
        } else {
          byCard.set(card.id, { card, quantity: 1 });
        }
      });

      setItems([...byCard.values()]);
      setLoading(false);
    };
    void init();
  }, [navigate]);

  const filtered = items.filter(i => {
    if (!search.trim()) return true;
    return (i.card?.name || '').toLowerCase().includes(search.toLowerCase());
  });
// Calculate total wallet value based on market values of cards and their quantities
  const totalValue = filtered.reduce(
    (acc, i) => acc + (Number(i.card?.market_value || 0) * i.quantity),
    0
  );
  return (
    <div className="wallet-container">
      <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen} />
      <main className="wallet-main">
        <div className="wallet-header">
          <div>
            <h2 className="wallet-title">Wallet</h2>
            <p className="wallet-subtitle">Cards you've purchased and their estimated market value.</p>
          </div>
          <div className="wallet-value-container">
            <div className="wallet-value-label">Estimated value</div>
            <div className="wallet-value">${totalValue.toFixed(2)}</div>
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your cards..."
          className="wallet-search"
        />
        {error && (
          <div className="wallet-error">{error}</div>
        )}
        <section className="wallet-table-section">
          <div className="wallet-table-scroll">
            <table className="wallet-table">
              <thead>
                <tr className="wallet-table-header-row">
                  <th className="wallet-table-header">Card</th>
                  <th className="wallet-table-header">Rarity</th>
                  <th className="wallet-table-header">Quantity</th>
                  <th className="wallet-table-header">Market Value</th>
                  <th className="wallet-table-header">Total</th>
                </tr>
              </thead>
              <tbody className="wallet-table-body">
                {loading && (
                  <tr><td colSpan={5} className="wallet-table-loading">Loading...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="wallet-table-empty">
                      {search ? 'No cards match your search.' : 'No purchased cards yet. Buy a listing to get started.'}
                    </td>
                  </tr>
                )}
                {!loading && filtered.map(({ card, quantity }) => {
                  const mv = Number(card?.market_value || 0);
                  const total = mv * quantity;
                  return (
                    <tr key={card.id} className="wallet-table-row">
                      <td className="wallet-table-cell wallet-table-card">{card.name}</td>
                      <td className="wallet-table-cell wallet-table-rarity">{card.rarity || '-'}</td>
                      <td className="wallet-table-cell wallet-table-quantity">{quantity}</td>
                      <td className="wallet-table-cell wallet-table-market">
                        {mv > 0 ? `$${mv.toFixed(2)}` : <span className="wallet-table-nodata">No data</span>}
                      </td>
                      <td className="wallet-table-cell wallet-table-total">
                        {mv > 0 ? `$${total.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="wallet-disclaimer">
          Market values are set by Flare based on card rarity and may not reflect current resale prices.
        </p>
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

export default Wallet;
