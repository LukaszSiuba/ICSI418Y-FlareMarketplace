import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Bell } from 'lucide-react';

// small bell icon w/ drop down list of recent notifications
const NotificationsBell = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const unread = items.filter(n => !n.is_read).length;

  // clicking outside closes this
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!user) {
      return;
    }
    let channel = null;
    const fetchInitial = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setItems(data || []);
      setLoading(false);
    };
    void fetchInitial();

    channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems(prev => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-colors text-sm"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-[#161b22] border border-white/10 rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <span className="text-sm font-bold text-white">Notifications</span>
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
          </div>
          {loading && (
            <div className="p-6 text-center text-gray-500 text-sm italic">Loading...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm italic">No notifications yet.</div>
          )}
          {!loading && items.map(n => (
            <button
              key={n.id}
              onClick={() => void handleClick(n)}
              className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-blue-500/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-white">{n.title}</span>
                {!n.is_read && (
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                )}
              </div>
              {n.body && <p className="text-xs text-gray-400 mt-1 line-clamp-3">{n.body}</p>}
              <p className="text-[10px] text-gray-500 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
