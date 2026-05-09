import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const getSessionId = () => {
  const existing = localStorage.getItem('flare_presence_session_id');
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem('flare_presence_session_id', created);
  return created;
};

const getPublicIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.ip || null;
  } catch {
    return null;
  }
};

const upsertPresence = async ({ userId, sessionId, ipAddress }) => {
  await supabase.from('user_presence').upsert(
    {
      session_id: sessionId,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: navigator.userAgent,
      is_online: true,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  );
};

const markOffline = async ({ sessionId }) => {
  await supabase
    .from('user_presence')
    .update({ is_online: false, last_seen: new Date().toISOString() })
    .eq('session_id', sessionId);
};

const OnlinePresenceTracker = () => {
  useEffect(() => {
    let stopped = false;
    let intervalId = null;
    let sessionId = null;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user || stopped) return;

      sessionId = getSessionId();
      const ipAddress = await getPublicIp();
      if (stopped) return;

      await upsertPresence({ userId: user.id, sessionId, ipAddress });

      intervalId = window.setInterval(() => {
        void upsertPresence({ userId: user.id, sessionId, ipAddress });
      }, 60000);
    };

    void start();

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user || !sessionId) return;
        const ipAddress = await getPublicIp();
        await upsertPresence({ userId: user.id, sessionId, ipAddress });
      }
    };

    const handleUnload = () => {
      if (!sessionId) return;
      void markOffline({ sessionId });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      stopped = true;
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      if (sessionId) {
        void markOffline({ sessionId });
      }
    };
  }, []);

  return null;
};

export default OnlinePresenceTracker;
