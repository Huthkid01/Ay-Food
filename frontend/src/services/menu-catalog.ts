import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { slugify } from '../utils/helpers';
import { resolveFoodImage } from '../utils/food-images';
import type { Category, Food } from '../types';

export type MenuCatalog = {
  foods: Food[];
  categories: Category[];
  source: 'supabase' | 'cache' | 'empty';
};

const CATALOG_EVENT = 'ay-food-catalog-changed';
const CATALOG_CHANNEL = 'ay-food-catalog';
const MENU_CACHE_KEY = 'ay-food-menu-catalog-cache';

function emptyCatalog(): MenuCatalog {
  return { foods: [], categories: [], source: 'empty' };
}

function readMenuCache(): MenuCatalog | null {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuCatalog;
    if (!parsed?.foods?.length) return null;
    return { ...parsed, source: 'cache' };
  } catch {
    return null;
  }
}

function writeMenuCache(catalog: MenuCatalog) {
  try {
    if (!catalog.foods.length) {
      localStorage.removeItem(MENU_CACHE_KEY);
      return;
    }
    localStorage.setItem(
      MENU_CACHE_KEY,
      JSON.stringify({
        foods: catalog.foods,
        categories: catalog.categories,
        source: 'cache',
      }),
    );
  } catch {
    // ignore quota
  }
}

function mapSupabaseFood(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  tags: string | null;
  is_available: boolean;
  is_popular: boolean;
  is_new: boolean;
  prep_time_minutes: number;
  categories?: { name: string; slug: string } | null;
  food_portions?: Array<{ id: string; portion_name: string; price: number; is_available: boolean }>;
}): Food {
  const portions = (row.food_portions ?? [])
    .filter((p) => p.is_available !== false)
    .map((p) => ({
      id: p.id,
      price: p.price,
      portion: { id: p.id, name: p.portion_name, slug: slugify(p.portion_name) },
    }));

  // Keep ₦0 soups/sides (confirm / seasonal) — invent a default portion only if DB has none
  if (portions.length === 0) {
    portions.push({
      id: `${row.id}-medium`,
      price: 0,
      portion: { id: 'medium', name: 'Standard', slug: 'standard' },
    });
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image: resolveFoodImage({
      image: row.image,
      slug: row.slug,
      category: {
        slug: row.categories?.slug ?? 'uncategorized',
      },
    }),
    tags: row.tags ?? '',
    isPopular: row.is_popular,
    isNew: row.is_new,
    prepTimeMinutes: row.prep_time_minutes,
    category: {
      name: row.categories?.name ?? 'Uncategorized',
      slug: row.categories?.slug ?? 'uncategorized',
    },
    portions,
  };
}

type FetchResult =
  | { ok: true; catalog: MenuCatalog }
  | { ok: false; error: string };

async function fetchFromSupabase(): Promise<FetchResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const [{ data: foods, error: foodsErr }, { data: categories, error: catsErr }] = await Promise.all([
    supabase
      .from('foods')
      .select('*, categories(name, slug), food_portions(*)')
      .eq('is_available', true)
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, slug, description, image, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (foodsErr || catsErr) {
    return { ok: false, error: foodsErr?.message || catsErr?.message || 'Failed to load menu' };
  }

  const mapped = (foods ?? []).map((row) => mapSupabaseFood(row as never));

  return {
    ok: true,
    catalog: {
      source: mapped.length ? 'supabase' : 'empty',
      foods: mapped,
      categories: (categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? undefined,
        image: c.image ?? undefined,
      })),
    },
  };
}

/**
 * Public menu — always from Supabase when configured.
 * Cache is only used if the network/query fails (last known DB snapshot).
 * A successful empty DB response clears the cache (no stale menu).
 */
export async function fetchMenuCatalog(): Promise<MenuCatalog> {
  if (!isSupabaseConfigured()) {
    return emptyCatalog();
  }

  const result = await fetchFromSupabase();
  if (result.ok) {
    writeMenuCache(result.catalog);
    return result.catalog;
  }

  const cached = readMenuCache();
  if (cached) return cached;

  return emptyCatalog();
}

/** Notify all open tabs/pages that menu changed. */
export function notifyCatalogChanged() {
  try {
    window.dispatchEvent(new Event(CATALOG_EVENT));
    localStorage.setItem('ay-food-catalog-bump', String(Date.now()));
    const channel = new BroadcastChannel(CATALOG_CHANNEL);
    channel.postMessage({ type: 'catalog-changed' });
    channel.close();
  } catch {
    // ignore
  }
}

export function subscribeCatalogChanged(onChange: () => void) {
  const onEvent = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'ay-food-catalog-bump' || e.key === MENU_CACHE_KEY) {
      onChange();
    }
  };

  window.addEventListener(CATALOG_EVENT, onEvent);
  window.addEventListener('storage', onStorage);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CATALOG_CHANNEL);
    channel.onmessage = () => onChange();
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(CATALOG_EVENT, onEvent);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

export const MENU_CATALOG_KEY = ['menu-catalog'] as const;
