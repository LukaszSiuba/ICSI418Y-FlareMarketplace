import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';

const ListingsGrid = ({ listings: initialListings, loading, onView, emptyMessage = 'No cards found matching your criteria.' }) => {
  // storing local copy of the listings so we can update the view count instantly on the screen
  const [localListings, setLocalListings] = useState([]);

  // update the local list whenever the main list from the db changes
  React.useEffect(() => {
    setLocalListings(initialListings || []);
  }, [initialListings]);

  const handleViewDetails = async (listingId) => {
    try {
      const targetListing = localListings.find(l => l.id === listingId);
      const currentViews = targetListing?.views || 0;
      const newViews = currentViews + 1;

      setLocalListings(prev =>
        prev.map(l => l.id === listingId ? { ...l, views: newViews } : l)
      );

      // save new view count to db
      await supabase
        .from('listings')
        .update({ views: newViews })
        .eq('id', listingId);

    } catch (err) {
      // logs errors 
      console.error('Error updating view count:', err);
    }
  };

  // animated placeholders while the data is still loading
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse bg-[#161b22] border border-white/5 rounded-xl p-4 h-80">
            <div className="bg-white/5 h-48 rounded-lg mb-4" />
            <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
          </div>
        ))}
      </div>
    );
  }

  // if no cards match the current search or filters
  if (localListings.length === 0) {
    return (
      <div className="text-center py-20 bg-[#161b22] border border-dashed border-white/10 rounded-2xl">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {localListings.map((listing) => (
        <div
          key={listing.id}
          className="group bg-[#161b22] border border-white/5 rounded-xl p-4 hover:border-blue-500/40 hover:bg-[#1c2128] transition-all duration-200 cursor-pointer"
          onClick={() => {
            if (onView) onView(listing);
            handleViewDetails(listing.id);
          }}
        >
          <div className="relative aspect-3/4 mb-4 bg-black/30 rounded-lg overflow-hidden flex items-center justify-center p-4 border border-white/5">
            <img
              src={listing.image_url || '/placeholder-card.png'}
              alt={listing.cards?.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-gray-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-white/10">
              {listing.condition}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-bold text-white truncate flex-1 text-sm">
                {listing.cards?.name}
              </h4>
              <span className="text-blue-400 font-extrabold text-sm">
                ${Number(listing.price).toFixed(2)}
              </span>
            </div>

            {listing.cards?.market_value != null && (() => {
              const askPrice = Number(listing.price);
              const mv = Number(listing.cards.market_value);
              const diff = askPrice - mv;
              return (
                <div className="text-[10px] text-gray-500">
                  Market: <span className="text-emerald-400 font-semibold">${mv.toFixed(2)}</span>
                  {diff > 0 && (
                    <span className="ml-1 text-amber-400">+${diff.toFixed(2)}</span>
                  )}
                  {diff < 0 && (
                    <span className="ml-1 text-emerald-400">${diff.toFixed(2)}</span>
                  )}
                  {diff === 0 && (
                    <span className="ml-1 text-gray-500">at market</span>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {listing.cards?.rarity}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {listing.views || 0} views
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onView) onView(listing);
              handleViewDetails(listing.id);
            }}
            className="w-full mt-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
          >
            View Listing
          </button>
        </div>
      ))}
    </div>
  );
};

export default ListingsGrid;
