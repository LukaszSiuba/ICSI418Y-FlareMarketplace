import { supabase } from '../../supabaseClient';
export async function notifyUser({ userId, type, title, body = null, link = null }) {
  if (!userId || !type || !title) return { error: new Error('bug with notis') };
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, link });
  return { error };
}

export async function notifyUsersWithRoles({ roles, type, title, body = null, link = null }) {
  if (!roles?.length || !type || !title) {
    return { error: new Error('Bug with notis') };
  }

  const { data, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', roles);

  if (roleError) return { error: roleError };

  const userIds = [...new Set((data || []).map(row => row.user_id).filter(Boolean))];
  if (userIds.length === 0) return { error: null };

  const { error } = await supabase
    .from('notifications')
    .insert(userIds.map(userId => ({ user_id: userId, type, title, body, link })));

  return { error };
}

export async function logAudit({ actorId, actorRole, action, targetType = null, targetId = null, details = null }) {
  if (!actorId || !action) return { error: new Error('actorId and action are required') };
  const { error } = await supabase
    .from('audit_log')
    .insert({
      actor_id: actorId,
      actor_role: actorRole || null,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  return { error };
}
