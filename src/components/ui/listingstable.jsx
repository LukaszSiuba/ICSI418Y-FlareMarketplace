import React from 'react'

const ListingsTable = ({ listings, loading, onEdit, onDelete, onCancel, isHistory }) => {
  // show loading message while data is being fetched
  if (loading) {
    return <div className='p-8 text-center text-gray-500 italic'>Loading your inventory...</div>;
  }

  // if the user has no listings yet
  if (listings.length === 0) {
    return <div className='p-12 text-center text-gray-500 italic'>{isHistory ? 'No sold or deleted listings yet.' : 'No active listings found.'}</div>;
  }

  return (
    <div className='overflow-x-auto rounded-xl border border-white/5'>
      <table className='w-full text-left'>
        <thead>
        <tr className='bg-[#161b22] border-b border-white/5 text-xs uppercase text-gray-500 tracking-wider'>
          <th className='p-4'>Photo</th>
          <th className='p-4'>Card</th>
          <th className='p-4'>Condition</th>
          <th className='p-4'>Price</th>
          <th className='p-4 text-center'>{isHistory ? 'Status' : 'Actions'}</th>
        </tr>
        </thead>
        <tbody className='divide-y divide-white/5 bg-[#0d1117]'>
        {listings.map((listing) => (
          <tr key={listing.id} className='hover:bg-white/5 transition-colors'>
            <td className='p-4'>
              <img
                src={listing.image_url || '/placeholder.png'}
                alt='card'
                className='w-12 h-12 object-cover rounded border border-white/10 bg-black/30'
              />
            </td>
            <td className='p-4'>
              <p className='font-semibold text-white text-sm'>{listing.cards?.name}</p>
              <p className='text-xs text-gray-500 uppercase tracking-wider mt-0.5'>{listing.cards?.rarity}</p>
            </td>

            <td className='p-4 text-gray-300 text-sm'>{listing.condition}</td>
            <td className='p-4'>
              <span className='text-blue-400 font-extrabold text-sm'>
                ${Number(listing.price).toFixed(2)}
              </span>
              {listing.cards?.market_value != null && (() => {
                const diff = Number(listing.price) - Number(listing.cards.market_value);
                return (
                  <div className='text-[10px] text-gray-500 mt-0.5'>
                    Market: <span className='text-emerald-400 font-semibold'>${Number(listing.cards.market_value).toFixed(2)}</span>
                    {diff > 0 && <span className='ml-1 text-amber-400'>+${diff.toFixed(2)}</span>}
                    {diff < 0 && <span className='ml-1 text-emerald-400'>${diff.toFixed(2)}</span>}
                    {diff === 0 && <span className='ml-1 text-gray-500'>at market</span>}
                  </div>
                );
              })()}
            </td>

            <td className='p-4'>
              {isHistory ? (
                <span className='text-xs text-gray-500 font-semibold uppercase tracking-wider'>
                  {listing.deleted ? 'Deleted' : (listing.cancelled ? 'Cancelled' : 'Sold')}
                </span>
              ) : (
                <div className='flex justify-center gap-4'>
                  <button
                    onClick={() => onEdit(listing)}
                    className='text-blue-400 hover:text-blue-300 text-sm font-medium cursor-pointer'
                  >
                    Edit
                  </button>
                  {onCancel && (
                    <button
                      onClick={() => onCancel(listing.id)}
                      className='text-amber-400 hover:text-amber-300 text-sm font-medium cursor-pointer'
                      title='Stop bids early'
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(listing.id)}
                    className='text-red-400 hover:text-red-300 text-sm font-medium cursor-pointer'
                  >
                    Remove
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListingsTable
