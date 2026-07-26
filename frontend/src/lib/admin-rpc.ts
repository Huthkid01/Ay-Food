import { isSupabaseConfigured, supabase } from './supabase';
import {
  ADMIN_UNAUTHORIZED_EVENT,
  getAdminToken,
  setAdminToken,
} from './admin-token';

export { ADMIN_UNAUTHORIZED_EVENT, getAdminToken, setAdminToken } from './admin-token';

function emitUnauthorized() {
  try {
    window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
  } catch {
    // ignore
  }
}

export async function adminLogin(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  const { data, error } = await supabase.rpc('admin_login', {
    p_email: email.trim().toLowerCase(),
    p_password: password,
  });
  if (error || !data) {
    throw new Error(error?.message || 'Invalid email or password');
  }
  const row = data as { token?: string; email?: string };
  if (!row.token) throw new Error('Invalid email or password');
  setAdminToken(row.token);
  return { email: row.email || email, token: row.token };
}

export async function adminLogout() {
  const token = getAdminToken();
  setAdminToken(null);
  if (token && isSupabaseConfigured()) {
    try {
      await supabase.rpc('admin_logout', { p_admin_token: token });
    } catch {
      // ignore
    }
  }
}

/** Call an admin_* RPC with the session token. Throws if not logged in. */
export async function adminRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  const token = getAdminToken();
  if (!token) {
    emitUnauthorized();
    throw new Error('Admin session expired — please sign in again');
  }
  const { data, error } = await supabase.rpc(fn, {
    p_admin_token: token,
    ...args,
  });
  if (error) {
    const msg = error.message || 'Admin request failed';
    if (/unauthorized/i.test(msg)) {
      setAdminToken(null);
      emitUnauthorized();
      throw new Error('Admin session expired — please sign in again');
    }
    throw new Error(msg);
  }
  return data as T;
}
