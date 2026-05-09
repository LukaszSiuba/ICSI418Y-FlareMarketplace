import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const enforce = async ({ status, status_until, status_reason }) => {
  if (!status) return false;
  if (status === 'banned') {
    alert(`Your account has been banned${status_reason ? `: ${status_reason}` : '.'}`);
    await supabase.auth.signOut();
    window.location.href = '/';
    return true;
  }
  if (status === 'suspended') {
    const until = status_until ? new Date(status_until) : null;
    if (!until || until > new Date()) {
      const untilText = until ? ` until ${until.toLocaleDateString()}` : '';
      alert(`Your account has been suspended${untilText}${status_reason ? ` - ${status_reason}` : '.'}`);
      await supabase.auth.signOut();
      window.location.href = '/';
      return true;
    }
  }
  return false;
};

const ModerationEnforcer = () => {
  useEffect(() => {
    let channel = null;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('users')
        .select('status, status_until, status_reason')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const enforced = await enforce(profile || {});
      if (enforced || cancelled) return;

      channel = supabase
        .channel(`moderation-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            void enforce(payload.new || {});
          }
        )
        .subscribe();
    };

    void start();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void start();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default ModerationEnforcer;
