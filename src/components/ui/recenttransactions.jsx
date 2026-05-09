import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ArrowRightLeft } from 'lucide-react';

const RecentTransactions = () => {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          price,
          transaction_date,
          image_url,
          cards (name, rarity),
          buyer:buyer_id (username),
          seller:seller_id (username)
        `)
        .eq('status', 'completed')
        .order('transaction_date', { ascending: false })
        .limit(6);

      if (!error) setTxs(data || []);
      setLoading(false);
    };
    void fetch();
  }, []);

  if (loading || txs.length === 0) return null;

  const rarityColor = (rarity) => {
    switch (rarity) {
      case 'Secret Rare': return 'text-purple-300';
      case 'Holo Rare':   return 'text-amber-300';
      case 'Rare':        return 'text-blue-300';
      case 'Uncommon':    return 'text-emerald-300';
      default:            return 'text-gray-400';
    }
  };

  return (
    <section className="animate-in fade-in duration-700">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-2xl font-bold text-white tracking-tight">Recent Sales</h3>
        <ArrowRightLeft className="h-5 w-5 text-blue-400" aria-hidden="true" />
      </div>

      <div className="bg-[#161b22] rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#0d1117] border-b border-white/5 text-xs uppercase text-gray-500 tracking-wider">
              <th className="px-5 py-3">Card</th>
              <th className="px-5 py-3">Seller</th>
              <th className="px-5 py-3">Buyer</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {txs.map(tx => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/30 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {tx.image_url
                        ? <img src={tx.image_url} alt={tx.cards?.name} className="w-full h-full object-contain p-0.5" />
                        : <span className="text-gray-600 text-xs">?</span>
                      }
                    </div>
                    <div>
                      <span className="font-semibold text-white text-sm">{tx.cards?.name || '—'}</span>
                      {tx.cards?.rarity && (
                        <div className={`text-[10px] font-semibold uppercase tracking-wider ${rarityColor(tx.cards.rarity)}`}>
                          {tx.cards.rarity}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400">{tx.seller?.username || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-400">{tx.buyer?.username || '—'}</td>
                <td className="px-5 py-3 text-sm text-blue-400 font-bold">${Number(tx.price).toFixed(2)}</td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {new Date(tx.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentTransactions;
