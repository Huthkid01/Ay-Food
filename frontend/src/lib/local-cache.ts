/**
 * Local storage policy for Ay Food:
 * KEEP — DB menu/content cache, cart, visitor id, admin session/theme
 * NEVER — orders, visits, or local flyer menu seed (menu lives in Supabase)
 */

const BUSINESS_KEYS = [
  'ay-food-admin-orders',
  'ay-food-orders-bump',
  'ay-food-demo-orders-seed',
  'ay-food-demo-visits-seed',
  'ay-food-site-sessions',
  'ay-food-site-page-views',
  // Old local menu seeds — DB is the source of truth now
  'ay-food-admin-foods',
  'ay-food-admin-categories',
  'ay-food-menu-seed-version',
] as const;

/** Wipe leftover business / seed data from older builds (safe to call on every boot). */
export function clearBusinessLocalData() {
  try {
    for (const key of BUSINESS_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/** Keys that are allowed for UX / cache (documentation + audits). */
export const ALLOWED_LOCAL_KEYS = [
  'ay-food-cart-v2',
  'ay-food-checkout-draft',
  'ay-food-site-content',
  'ay-food-menu-catalog-cache',
  'ay-food-site-settings',
  'ay-food-visitor-session',
  'ay-food-admin-session',
  'ay-food-admin-theme',
  'ay-food-admin-token',
  'ay-food-contact-seed',
  'ay-food-catalog-bump',
  'ay-food-site-content-bump',
  'ay-food-demo-cleared',
] as const;
