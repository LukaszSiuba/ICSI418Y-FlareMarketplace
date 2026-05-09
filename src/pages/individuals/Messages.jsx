import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import AuthModal from '../../log/forms/authmodal.jsx';
import { supabase } from '../../../supabaseClient';
import Navbar from '@/components/ui/navbar.jsx';
import { notifyUser } from '@/lib/notify.js';

//Parse via JSON
const parseMessageContent = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

const Messages = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState('');
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fetchConversation = useCallback(async (selfId, otherId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*') //Select all
      .or(`and(sender_id.eq.${selfId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${selfId})`)
      .order('created_at', { ascending: true });

    if (error) {
      setStatus('Loading');
      setMessages([]);
      return;
    }

    setStatus('');
    setMessages(data || []);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      setUser(activeUser);
    };
    void checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, username')
        .neq('id', user.id)
        .order('username');
      const contacts = data || [];
      setUsers(contacts);

      // Support both navigation state (from in-app links) and ?with= query param (from notification links)
      const targetId = location.state?.userId || searchParams.get('with');
      if (targetId) {
        const found = contacts.find(contact => contact.id === targetId);
        if (found) {
          setSelectedUser(found);
          return;
        }

        const { data: singleUser } = await supabase
          .from('users')
          .select('id, username')
          .eq('id', targetId)
          .maybeSingle();
        if (singleUser) {
          setSelectedUser(singleUser);
          setUsers(prev => [singleUser, ...prev.filter(contact => contact.id !== singleUser.id)]);
        }
      }
    };
    void fetchUsers();
  }, [user, location.state, searchParams]);

  useEffect(() => {
    if (!user || !selectedUser) return;
    void fetchConversation(user.id, selectedUser.id);

    const channel = supabase
      .channel(`messages-${user.id}-${selectedUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new;
          // Only update the view if this message belongs to the current conversation
          const inConversation =
            (row.sender_id === user.id && row.receiver_id === selectedUser.id) ||
            (row.sender_id === selectedUser.id && row.receiver_id === user.id);
          if (inConversation) {
            setMessages(prev => [...prev, row]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser, fetchConversation]);

  const bidResponses = useMemo(() => {
    const responses = new Map();
    messages.forEach(message => {
      const parsed = parseMessageContent(message.content);
      if (parsed?.type === 'bid_response' && parsed.bidMessageId) {
        responses.set(parsed.bidMessageId, parsed);
      }
    });
    return responses;
  }, [messages]);

  const getLegacyBidStatus = (messageId) => {
    const index = messages.findIndex(message => message.id === messageId);
    if (index === -1) return null;
    const next = messages[index + 1];
    if (!next) return null;
    if (next.content === 'SELLER has denied the bid') return 'declined';
    if (next.content === 'SELLER has accepted the bid') return 'accepted';
    return null;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const content = newMessage.trim();
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content,
    });

    if (error) {
      setStatus('Due to high volumes, please try sending this message again later.');
      return;
    }

    setNewMessage('');
    await notifyUser({
      userId: selectedUser.id,
      type: 'message',
      title: `${user.user_metadata?.username || 'A user'} sent you a message`,
      body: content.slice(0, 120),
      link: `/messages?with=${user.id}`,
    });
    await fetchConversation(user.id, selectedUser.id);
  };

  const handleBidResponse = async (bidMessage, bid, decision) => {
    if (!user || !selectedUser || bidResponses.has(bidMessage.id) || getLegacyBidStatus(bidMessage.id)) return;

    let cardId = bid.cardId;
    if (decision === 'accepted') {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, card_id, seller_id, is_active, sold, cards(name)')
        .eq('id', bid.listingId)
        .maybeSingle();

      if (listingError || !listing) {
        setStatus('The listing for this bid could not be found.');
        return;
      }
      if (listing.seller_id !== user.id) {
        setStatus('Only the listing owner can accept this bid.');
        return;
      }
      if (!listing.is_active || listing.sold) {
        setStatus('This listing is no longer available.');
        return;
      }

      cardId = cardId || listing.card_id;
      const soldAt = new Date().toISOString();
      const { error: listingUpdateError } = await supabase
        .from('listings')
        .update({ is_active: false, sold: true, sold_at: soldAt, buyer_id: bidMessage.sender_id })
        .eq('id', bid.listingId)
        .eq('seller_id', user.id);

      if (listingUpdateError) {
        setStatus('Error with listing.');
        return;
      }

      if (cardId) {
        await supabase.from('transactions').insert({
          id: crypto.randomUUID(),
          price: Number(bid.bid),
          status: 'completed',
          buyer_id: bidMessage.sender_id,
          seller_id: user.id,
          card_id: cardId,
          image_url: bid.image_url || null,
        });
      }
    }

    const responseText = decision === 'accepted' ? 'accepted' : 'declined';
    //JS to JSON.
    const responseContent = JSON.stringify({ 
      type: 'bid_response',
      bidMessageId: bidMessage.id,
      listingId: bid.listingId,
      cardName: bid.cardName,
      amount: Number(bid.bid),
      status: responseText,
    });

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: bidMessage.sender_id,
      content: responseContent,
    });

    if (error) {
      setStatus('Loading');
      return;
    }

    await notifyUser({
      userId: bidMessage.sender_id,
      type: decision === 'accepted' ? 'bid_accepted' : 'bid_declined',
      title: `Your bid was ${responseText}`,
      body: `${bid.cardName || 'Listing'} at ${formatMoney(bid.bid)} was ${responseText}.`,
      link: `/messages?with=${user.id}`,
    });
    await fetchConversation(user.id, selectedUser.id);
  };

    return (
      <div className="messages-container">
        <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen} />

        {!user ? (
          <main className="messages-main messages-signin-center">
            <div className="card text-center messages-signin-card">
              <h2 className="text-xl font-extrabold messages-signin-title">Messages</h2>
              <p className="mt-2 text-sm messages-signin-desc">Sign in to contact sellers, buyers, and respond to offers.</p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="btn btn-blue mt-5 text-sm font-semibold"
              >
                Sign In
              </button>
            </div>
          </main>
        ) : (
          <main className="messages-main">
            {status && (
              <div className="messages-status">{status}</div>
            )}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <aside className="messages-sidebar" style={{ overflowY: 'auto' }}>
                <h3 className="messages-sidebar-title">Chats</h3>
                <div className="messages-sidebar-list">
                  {users.length === 0 && <div className="messages-chat-empty">No users found.</div>}
                  {users.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedUser(contact)}
                      className={
                        'messages-sidebar-user' +
                        (selectedUser?.id === contact.id ? ' selected' : '')
                      }
                    >
                      {contact.username || contact.id}
                    </button>
                  ))}
                </div>
              </aside>

              <section style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#161b22' }}>
                <div className="messages-chat-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', gap: '0.5rem' }}>
                  {!selectedUser && <div className="messages-chat-empty">Select a user to start chatting.</div>}
                  {selectedUser && messages.map(message => {
                    const parsed = parseMessageContent(message.content);
                    if (parsed?.type === 'bid') {
                      const isBuyer = message.sender_id === user.id;
                      const response = bidResponses.get(message.id);
                      const bidStatus = response?.status || getLegacyBidStatus(message.id);
                      const canRespond = message.receiver_id === user.id && !bidStatus;
                      return (
                        <div
                          key={message.id}
                          className={
                            'messages-bid-card' +
                            (isBuyer ? ' mine' : ' other') +
                            (bidStatus ? ' opacity-70' : '')
                          }
                        >
                          <div className="bid-title">Bid Proposal</div>
                          <img
                            src={parsed.image_url || '/placeholder-card.png'}
                            alt={parsed.cardName || 'Bid card'}
                            className="bid-image"
                          />
                          <div className="bid-info">Card: <span className="font-semibold">{parsed.cardName}</span></div>
                          <div className="bid-amount">Bid Amount: <span className="font-extrabold">{formatMoney(parsed.bid)}</span></div>
                          {bidStatus && (
                            <div className="bid-status">{bidStatus}</div>
                          )}
                          {canRespond && (
                            <div className="bid-actions">
                              <button
                                className="btn btn-emerald"
                                onClick={() => void handleBidResponse(message, parsed, 'accepted')}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-red"
                                onClick={() => void handleBidResponse(message, parsed, 'declined')}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          <div className="bid-time">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    }
                    if (parsed?.type === 'bid_response') {
                      return (
                        <div key={message.id} className="messages-bid-response">
                          <hr />
                          <span className="messages-bid-response-text">
                            seller {parsed.status} bid for {formatMoney(parsed.amount)}
                          </span>
                          <hr />
                        </div>
                      );
                    }
                    if (message.content === 'SELLER has denied the bid' || message.content === 'SELLER has accepted the bid') {
                      return (
                        <div key={message.id} className="messages-bid-response">
                          <hr />
                          <span className="messages-bid-response-text">
                            {message.content === 'SELLER has denied the bid' ? 'seller declined bid' : 'seller accepted bid'}
                          </span>
                          <hr />
                        </div>
                      );
                    }
                    const isMine = message.sender_id === user.id;
                    return (
                      <div
                        key={message.id}
                        className={
                          'messages-message' +
                          (isMine ? ' mine' : ' other')
                        }
                      >
                        {message.content}
                        <div className="message-time">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedUser && (
                  <form onSubmit={handleSend} className="messages-form">
                    <input
                      type="text"
                      className="messages-form-input"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="messages-form-btn"
                      disabled={!newMessage.trim()}
                    >
                      Send
                    </button>
                  </form>
                )}
              </section>

            </div>
          </main>
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={async () => {
            setIsAuthModalOpen(false);
            const { data: { user: activeUser } } = await supabase.auth.getUser();
            setUser(activeUser);
          }}
        />
      </div>
    );
};

export default Messages;
