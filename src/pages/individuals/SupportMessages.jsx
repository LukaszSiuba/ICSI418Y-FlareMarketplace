import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { notifyUser } from '@/lib/notify.js';

// SupportMessages: chat panel for support agents.
const SupportMessages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState([]); // contacts list
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Verify signed-in + support role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        navigate('/');
        return;
      }
      setUser(u);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', u.id)
        .single();
      if (roleError || !roleData || roleData.role !== 'support') {
        setAuthorized(false);
        setAuthChecked(true);
        setTimeout(() => navigate('/home'), 1500);
        return;
      }
      setAuthorized(true);
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  // Build the contacts list: anyone the agent has messaged + anyone
  // attached to a support ticket submitter or referenced user.
  useEffect(() => {
    if (!user || !authorized) return;
    const fetchContacts = async () => {
      setLoading(true);
      const contactIds = new Set();

      // From past messages
      const { data: msgRows } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      (msgRows || []).forEach(m => {
        if (m.sender_id && m.sender_id !== user.id) contactIds.add(m.sender_id);
        if (m.receiver_id && m.receiver_id !== user.id) contactIds.add(m.receiver_id);
      });

      // From tickets the support agent can see
      const { data: ticketRows } = await supabase
        .from('support_tickets')
        .select('user_id, related_user');
      (ticketRows || []).forEach(t => {
        if (t.user_id && t.user_id !== user.id) contactIds.add(t.user_id);
        if (t.related_user && t.related_user !== user.id) contactIds.add(t.related_user);
      });

      let contacts = [];
      if (contactIds.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username')
          .in('id', Array.from(contactIds));
        contacts = usersData || [];
      }

      setUsers(contacts);

      // Auto-select user from navigation state if provided
      if (location.state && location.state.userId) {
        const found = contacts.find(c => c.id === location.state.userId);
        if (found) {
          setSelectedUser(found);
        } else {
          // Pull the single user record so we can still open a chat
          const { data: lone } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', location.state.userId)
            .single();
          if (lone) {
            setSelectedUser(lone);
            setUsers(prev => [lone, ...prev]);
          }
        }
      }

      setLoading(false);
    };
    fetchContacts();
  }, [user, authorized, location.state]);

  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!user || !selectedUser) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
    const channel = supabase
      .channel(`support-messages-${user.id}-${selectedUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.sender_id === selectedUser.id) {
            setMessages(prev => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    });
    if (!error) {
      setNewMessage('');
      await notifyUser({
        userId: selectedUser.id,
        type: 'support_message',
        title: 'Support sent you a message',
        body: newMessage.trim().slice(0, 120),
        link: '/messages',
      });
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
  };

  if (!authChecked) {
    return (
      <div className="supportmessages-center supportmessages-bg text-supportmessages-muted">
        Loading...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="supportmessages-center supportmessages-bg text-supportmessages-muted">
        Unauthorized: support access only. Redirecting...
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (u.username || '').toLowerCase().includes(s) || (u.id || '').toLowerCase().includes(s);
  });

  return (
    <div className="messages-container">
      <header className="supportmessages-header">
        <div className="supportmessages-header-inner">
          <h1 className="supportmessages-title">Flare</h1>
          <div className="supportmessages-header-actions">
            <nav className="supportmessages-nav">
              <Link to="/support" className="supportmessages-navlink">Tickets</Link>
              <Link to="/support-messages" className="supportmessages-navlink active">Support Messages</Link>
            </nav>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
              className="supportmessages-signout-btn"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="messages-main">
        <div className="messages-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside className="messages-sidebar">
            <h3 className="messages-sidebar-title">Conversations</h3>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="messages-search"
            />
            <div className="messages-sidebar-list">
              {loading && (
                <div className="messages-chat-empty">Loading contacts...</div>
              )}
              {!loading && filteredUsers.length === 0 && (
                <div className="messages-chat-empty">No conversations yet.</div>
              )}
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={
                    'messages-sidebar-user' +
                    (selectedUser?.id === u.id ? ' selected' : '')
                  }
                >
                  {u.username || u.id}
                </button>
              ))}
            </div>
          </aside>

          <section className="messages-chat-section">
            <div className="messages-chat-list">
              {!selectedUser && (
                <div className="messages-chat-empty">
                  Select a user to start chatting.
                </div>
              )}
              {selectedUser && messages.length === 0 && (
                <div className="messages-chat-empty">
                  No messages yet. Say hello.
                </div>
              )}
              {selectedUser && messages.map(msg => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={
                      'messages-message' + (isMine ? ' mine' : ' other')
                    }
                  >
                    {msg.content}
                    <div className={
                      'message-time' + (isMine ? '' : ' other')
                    }>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
};

export default SupportMessages;
