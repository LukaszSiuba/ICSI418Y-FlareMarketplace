import React, { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { Flame } from 'lucide-react'

const FeaturedListings = () => {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopListings = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, cards(*)')
        .eq('is_active', true)
        .order('views', { ascending: false }) // It still works even if views are 0
        .limit(4)

      if (!error) setFeatured(data || [])
      setLoading(false)
    }
    void fetchTopListings()
  }, [])

  // we only return null if there is absolutely NO data in the table
  if (loading || featured.length === 0) return null

  return (
    <section className="animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-2xl font-bold text-white tracking-tight">Hottest Listings</h3>
        <Flame className="h-5 w-5 text-blue-400" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {featured.map((item) => (
          <div key={item.id} className="bg-[#161b22] border border-white/5 rounded-xl p-4 hover:border-blue-500/40 hover:bg-[#1c2128] transition-all duration-200">
            <div className="aspect-square mb-3 bg-black/30 rounded-lg overflow-hidden border border-white/5">
              <img src={item.image_url || '/placeholder.png'} className="w-full h-full object-contain p-2" alt="card" />
            </div>
            <p className="font-bold text-white truncate text-sm">{item.cards?.name}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-blue-400 font-extrabold text-sm">${Number(item.price).toFixed(2)}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{item.views || 0} Views</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default FeaturedListings
