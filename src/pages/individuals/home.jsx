import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import AuthModal from '../../log/forms/authmodal.jsx'
import { supabase } from '../../../supabaseClient'
import Searchbar from '@/components/ui/searchbar.jsx'
import ListingsGrid from '@/components/ui/listingsgrid.jsx'
import Navbar from '@/components/ui/navbar.jsx'
import FeaturedListings from '@/components/ui/featuredlistings.jsx'
import RecentTransactions from '@/components/ui/recenttransactions.jsx'
import ViewListings from '@/components/ViewListings.jsx'
import SupportModal from '@/components/ui/supportmodal.jsx'
import { notifyUser } from '@/lib/notify.js'


const Home = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [listings, setListings] = useState([])

  // Initialize as true to match the starting state and satisfy ESLint
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState('All')
  const [selectedListing, setSelectedListing] = useState(null)
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportPrefill, setSupportPrefill] = useState({ relatedListing: '', relatedUser: '' });
  const [loadError, setLoadError] = useState('');

  // Requests the current session data
  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)
  }

  // Retrieves active listings
  const fetchListings = async () => {
    try {
      // Try with market_value first; fall back without it if the column doesn't exist yet.
      let { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          card_id,
          price,
          condition,
          image_url,
          views,
          seller_id,
          users:seller_id (username),
          cards (name, rarity, market_value)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error && /market_value/i.test(error.message || '')) {
        // market_value column not yet added — retry without it
        const fallback = await supabase
          .from('listings')
          .select(`
            id,
            card_id,
            price,
            condition,
            image_url,
            views,
            seller_id,
            users:seller_id (username),
            cards (name, rarity)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        setLoadError('Due to high volumes, please search at a later time.')
        setListings([])
        return
      }

      setLoadError('')
      setListings(data || [])
    } catch (err) {
      console.error('Error fetching listings:', err)
      setLoadError('Due to high volumes, please search at a later time.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      // Parallel fetch for speed
      await Promise.all([checkUser(), fetchListings()])
    }
    void initializeData()
  }, [])

  // Filter Logic
  const trimmedSearch = searchQuery.trim()
  const searchIsValid = /^[a-zA-Z0-9\s:'.,-]*$/.test(searchQuery)
  const searchError = searchQuery && !searchIsValid ? 'Please enter a valid name.' : ''

  const filteredListings = searchError ? [] : listings.filter((listing) => {
    const matchesName = (listing.cards?.name || '').toLowerCase().includes(trimmedSearch.toLowerCase())
    const matchesRarity = rarityFilter === 'All' || listing.cards?.rarity === rarityFilter
    return matchesName && matchesRarity
  })

  const handleClearFilters = () => {
    setSearchQuery('')
    setRarityFilter('All')
  }

  // Check if we are currently searching/filtering
  const isFiltering = trimmedSearch !== '' || rarityFilter !== 'All'
  const emptyMessage = loadError || searchError || (isFiltering ? 'Item not found, try again later.' : 'No cards are available right now.')

  return (
    <div className="app-container">
      <Navbar
        user={user}
        setUser={setUser}
        setIsAuthModalOpen={setIsAuthModalOpen}
      />

      <section className="hero-section">
        <div className="hero-content">
          <h2 className="hero-title">
            Buy, Sell, and Trade Rare Cards
          </h2>
          <p className="hero-subtitle">Join the ultimate marketplace for collectors.</p>
        </div>
      </section>

      <main className="main-content">

        <Searchbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          rarityFilter={rarityFilter}
          setRarityFilter={setRarityFilter}
        />
        {(searchError || loadError) && (
          <div className="alert-error">
            {searchError || loadError}
          </div>
        )}

        {/* FEATURED SECTION:
          Only show the "Hottest Listings" if the user is NOT actively filtering.
          This makes the UI cleaner during search.
        */}
        {!isFiltering && (
          <div className="flex flex-col gap-y-12">
            <FeaturedListings />
            <RecentTransactions />
          </div>
        )}

        {/* RESULTS SECTION */}
        <section className="results-section">
          <div className="results-header">
            <h3 className="results-title">
              {isFiltering ? `Search Results (${filteredListings.length})` : 'Latest Listings'}
            </h3>
            {isFiltering && (
              <button
                onClick={handleClearFilters}
                className="clear-filters-btn"
              >
                Clear all filters
              </button>
            )}
          </div>

          <ListingsGrid
            listings={filteredListings}
            loading={loading}
            onClearFilters={handleClearFilters}
            onView={setSelectedListing}
            emptyMessage={emptyMessage}
          />
        </section>

        {/* CTA SECTION */}
        {!user && (
          <section className="cta-section">
            <h3 className="cta-title">Ready to start collecting?</h3>
            <p className="cta-subtitle">Create an account to list your own cards for sale.</p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-blue cta-btn"
            >
              Create Free Account
            </button>
          </section>
        )}

      </main>

      <footer className="footer">
        <div className="footer-content">
          <p className="footer-text">&copy; {new Date().getFullYear()} Flare Marketplace. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={async () => {
          setIsAuthModalOpen(false)
          await checkUser()
        }}
      />
    {/* View Listing Modal */}
    {selectedListing && (
      <ViewListings
        listing={selectedListing}
        user={user}
        onClose={() => setSelectedListing(null)}
        onReport={() => {
          setSupportPrefill({
            relatedListing: selectedListing.id,
            relatedUser: selectedListing.seller_id
          });
          setShowSupportModal(true);
          setSelectedListing(null);
        }}
        onBid={async (bid) => {
          if (!user) {
            setIsAuthModalOpen(true);
            return;
          }
          const messageContent = JSON.stringify({
            type: 'bid',
            listingId: selectedListing.id,
            cardId: selectedListing.card_id,
            image_url: selectedListing.image_url,
            cardName: selectedListing.cards?.name,
            bid,
            from: user?.id,
            to: selectedListing.seller_id,
            status: 'pending'
          });
          const { error } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: selectedListing.seller_id,
            content: messageContent
          });
          if (error) {
            alert('Due to high volumes, please try sending this bid again later.');
            return;
          }
          await notifyUser({
            userId: selectedListing.seller_id,
            type: 'bid',
            title: `New bid on ${selectedListing.cards?.name || 'your listing'}`,
            body: `${user.user_metadata?.username || 'A buyer'} offered $${Number(bid).toFixed(2)}.`,
            link: `/messages?with=${user?.id}`
          });
          navigate('/messages', {
            state: {
              userId: selectedListing.seller_id,
              username: selectedListing.users?.username || undefined
            }
          });
          setSelectedListing(null);
        }}
        onBuyNow={async () => {
          if (!user) { setIsAuthModalOpen(true); return; }
          const listing = selectedListing;

          // Mark listing as sold
          const soldAt = new Date().toISOString();
          const { error: listingErr } = await supabase
            .from('listings')
            .update({ is_active: false, sold: true, sold_at: soldAt, buyer_id: user.id })
            .eq('id', listing.id)
            .eq('is_active', true); // prevent double-buy race condition

          if (listingErr) throw new Error('This listing is no longer available.');

          // Create transaction record
          await supabase.from('transactions').insert({
            id: crypto.randomUUID(),
            price: Number(listing.price),
            status: 'completed',
            buyer_id: user.id,
            seller_id: listing.seller_id,
            card_id: listing.card_id,
            image_url: listing.image_url || null,
          });

          // Notify the seller
          await notifyUser({
            userId: listing.seller_id,
            type: 'sale',
            title: `Your listing was purchased`,
            body: `${user.user_metadata?.username || 'A buyer'} bought "${listing.cards?.name}" for $${Number(listing.price).toFixed(2)}.`,
            link: `/messages?with=${user.id}`,
          });

          setSelectedListing(null);
          // Refresh listings so the sold card disappears
          await fetchListings();
        }}
        onContact={() => {
          navigate('/messages', {
            state: {
              userId: selectedListing.seller_id,
              username: selectedListing.users?.username || undefined
            }
          });
          setSelectedListing(null);
        }}
        requireSignIn={() => {
          setIsAuthModalOpen(true);
          setSelectedListing(null);
        }}
      />
    )}

    {/* Support Modal (always rendered, only visible when showSupportModal is true) */}
    <SupportModal
      isOpen={showSupportModal}
      onClose={() => setShowSupportModal(false)}
      user={user}
      defaultRelatedListing={supportPrefill.relatedListing}
      defaultRelatedUser={supportPrefill.relatedUser}
    />
  </div>
  )
}

export default Home
