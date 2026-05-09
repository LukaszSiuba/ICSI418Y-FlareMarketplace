import React, { useState, useEffect } from 'react'
import AuthModal from '../../log/forms/authmodal.jsx'
import { supabase } from '../../../supabaseClient'
import CreateListingForm from '@/log/forms/createlisting.jsx'
import EditListingModal from '@/log/forms/editlistingmodal.jsx'
import Navbar from '@/components/ui/navbar.jsx'
import ListingsTable from '@/components/ui/listingstable.jsx' // Import the new component
import { notifyUser } from '@/lib/notify.js'

const Listings = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [userListings, setUserListings] = useState([])
  const [historyListings, setHistoryListings] = useState([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingListing, setEditingListing] = useState(null)

  // Fetch only the listings that belong to the logged-in user
  const fetchUserListings = async (userId) => {
    setIsLoadingListings(true)
    // Fetch all listings for the user
    const { data: allListings, error } = await supabase
      .from('listings')
      .select('*, cards(*)')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching listings:', error.message);
      setUserListings([]);
      setHistoryListings([]);
      setIsLoadingListings(false);
      return;
    }
    const active = (allListings || []).filter(l => l.is_active && !l.deleted && !l.cancelled && !l.sold);
    const history = (allListings || []).filter(l => !l.is_active || l.deleted || l.cancelled || l.sold);
    setUserListings(active);
    setHistoryListings(history);
    setIsLoadingListings(false);
  }

  // Get the list of all available cards from the dropdown menu
  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('is_archived', false)
      .order('name')

    if (error) console.error('Error fetching cards:', error.message)
    else setCards(data || [])
  }

  useEffect(() => {
    const initialize = async () => {
      const { data: { user: activeUser } } = await supabase.auth.getUser()
      setUser(activeUser)
      await fetchCards()
      if (activeUser) {
        await fetchUserListings(activeUser.id)
      }
    }
    void initialize()
  }, [])

  // Handle removing a listing from the database
  const handleDelete = async (listingId) => {
    const confirmed = window.confirm('Are you sure you want to remove this listing?')
    if (!confirmed) return

    // Try updating with deleted column
    const { error } = await supabase
      .from('listings')
      .update({ is_active: false, deleted: new Date().toISOString() })
      .eq('id', listingId)

    if (error) {
      if (/column\s+listings\.deleted\s+does not exist/i.test(error.message || '')) {
        // Fallback for legacy schema
        const { error: error2 } = await supabase
          .from('listings')
          .update({ is_active: false })
          .eq('id', listingId)
        if (error2) { alert(`Error: ${error2.message}`); return; }
      } else {
        alert(`Error: ${error.message}`)
        return;
      }
    }

    if (user) {
      await fetchUserListings(user.id)
    }
  }

  const notifyBiddersForListing = async (listingId, title, body) => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('sender_id, content')
      .eq('receiver_id', user.id);

    const bidderIds = new Set();
    (data || []).forEach(row => {
      try {
        const parsed = JSON.parse(row.content);
        if (parsed?.type === 'bid' && parsed.listingId === listingId && row.sender_id !== user.id) {
          bidderIds.add(row.sender_id);
        }
      } catch {
        // Plain text messages are ignored here.
      }
    });

    await Promise.all([...bidderIds].map(userId => notifyUser({
      userId,
      type: 'listing_cancelled',
      title,
      body,
      link: '/messages',
    })));
  };

  // Cancel an active listing, stop bids early, and move it to History.
  const handleCancel = async (listingId) => {
    const confirmed = window.confirm('Cancel this listing? It will stop accepting bids and move to History.')
    if (!confirmed) return
    const { error } = await supabase
      .from('listings')
      .update({ cancelled: true, is_active: false })
      .eq('id', listingId)

    if (error) {
      if (/column\s+listings\.cancelled\s+does not exist/i.test(error.message || '')) {
        // Fallback for legacy schema
        const { error: error2 } = await supabase
          .from('listings')
          .update({ is_active: false })
          .eq('id', listingId)
        if (error2) { alert(`Error: ${error2.message}`); return; }
      } else {
        alert(`Error: ${error.message}`)
        return;
      }
    }

    if (user) {
      await notifyBiddersForListing(
        listingId,
        'Listing closed early',
        'A listing you bid on was cancelled by the seller.'
      )
      await fetchUserListings(user.id)
    }
  }

  // Refresh the data after a listing is created or edited
  const handleSuccess = async () => {
    if (user) await fetchUserListings(user.id)
    setShowCreateForm(false)
    setEditingListing(null)
  }

  return (
    <div className="listings-page-container">
      <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen}/>

      <main className="listings-main">
        <div className="listings-header">
          <div>
            <h2 className="listings-title">Your Listings</h2>
            <p className="listings-subtitle">Manage your inventory and market listings.</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`listings-create-btn${showCreateForm ? ' cancel' : ''}`}
            >
              {showCreateForm ? 'Cancel' : '+ Create New Listing'}
            </button>
          )}
        </div>

        {/* Form to create a new item */}
        {user && showCreateForm && (
          <CreateListingForm user={user} cards={cards} onSuccess={handleSuccess}/>
        )}

        {/* Section showing the interactive table */}
        {user && (
          <>
            <section className="listings-section">
              <ListingsTable
                listings={userListings}
                loading={isLoadingListings}
                onEdit={setEditingListing}
                onDelete={handleDelete}
                onCancel={handleCancel}
              />
            </section>
            <section className="listings-history-section">
              <h3 className="listings-history-title">History</h3>
              <ListingsTable
                listings={historyListings}
                loading={isLoadingListings}
                onEdit={null}
                onDelete={null}
                isHistory
              />
            </section>
          </>
        )}
      </main>

      {/* Modal to edit an existing item */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSuccess={handleSuccess}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={async () => {
          setIsAuthModalOpen(false)
          const { data } = await supabase.auth.getUser()
          setUser(data.user)
        }}
      />
    </div>
  )
}

export default Listings
