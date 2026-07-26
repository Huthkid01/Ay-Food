const TOKEN_KEY = 'ay-food-admin-token';
export const ADMIN_UNAUTHORIZED_EVENT = 'ay-food-admin-unauthorized';

/** LocalStorage/session token helpers — no Supabase import (keeps storefront light). */
export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (!token) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}
