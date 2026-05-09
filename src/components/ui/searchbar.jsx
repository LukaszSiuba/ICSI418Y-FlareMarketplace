import React from 'react'

const Searchbar = ({ searchQuery, setSearchQuery, rarityFilter, setRarityFilter }) => {
  return (
    <section className='flex flex-col md:flex-row gap-4 md:gap-4 mb-4'>

      <div className='flex-1'>
        <input
          type='text'
          placeholder='Search for Charizard, Pikachu, Rayquaza...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full p-4 bg-[#161b22] border border-white/10 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all'
        />
      </div>
      <div className='w-full md:w-64'>
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className='w-full p-4 bg-[#161b22] border border-white/10 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer'
        >
          <option value='All'>All Rarities</option>
          <option value='Common'>Common</option>
          <option value='Uncommon'>Uncommon</option>
          <option value='Rare'>Rare</option>
          <option value='Holo Rare'>Holo Rare</option>
          <option value='Secret Rare'>Secret Rare</option>
        </select>
      </div>
    </section>
  )
}

export default Searchbar
