/**
 * Admin menu catalog helpers.
 * Orders / customers / visits live in Supabase — not localStorage.
 * Foods/categories here are a local menu draft cache when remote menu is empty.
 */
import {
  MENU_CATEGORIES,
  MENU_SEED_VERSION,
  NIGERIAN_MENU_FOODS,
} from '../data/nigerian-menu';
import { getFoodImageUrl } from '../utils/food-images';
import { generateId } from '../utils/helpers';
import type { Food } from '../types';

const FOODS_KEY = 'ay-food-admin-foods';
const CATEGORIES_KEY = 'ay-food-admin-categories';
const MENU_VERSION_KEY = 'ay-food-menu-seed-version';

export type AdminOrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'PACKING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type AdminOrderItem = {
  id: string;
  portionName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  packName?: string;
  food: { name: string; image?: string };
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  orderType: 'DELIVERY' | 'PICKUP';
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress?: string;
  createdAt: string;
  items: AdminOrderItem[];
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  foodCount: number;
};

export type AdminFood = Food & {
  isAvailable: boolean;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedFoods(): AdminFood[] {
  return NIGERIAN_MENU_FOODS.map((f) => ({
    ...f,
    image: f.image || getFoodImageUrl(f.slug, f.category.slug),
    isAvailable: true,
  }));
}

function seedCategories(): AdminCategory[] {
  return MENU_CATEGORIES.map((c, i) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: '',
    image: getFoodImageUrl('', c.slug),
    sortOrder: i + 1,
    isActive: true,
    foodCount: NIGERIAN_MENU_FOODS.filter((f) => f.category.slug === c.slug).length,
  }));
}

/** Local menu draft only — never auto-seed the flyer (Supabase is source of truth). */
function ensureLatestMenuSeed() {
  // no-op: do not write NIGERIAN_MENU into localStorage
}

function isCustomUpload(image?: string | null) {
  if (!image) return false;
  return (
    image.startsWith('data:') ||
    image.startsWith('blob:') ||
    image.includes('supabase.co/storage')
  );
}

function enrichFoodImages(foods: AdminFood[]): AdminFood[] {
  return foods.map((f) => ({
    ...f,
    image: isCustomUpload(f.image)
      ? f.image!
      : getFoodImageUrl(f.slug, f.category?.slug ?? 'sides', 'card'),
  }));
}

export const adminStore = {
  getFoods(): AdminFood[] {
    ensureLatestMenuSeed();
    const foods = readJson<AdminFood[] | null>(FOODS_KEY, null);
    if (!foods?.length) return [];
    const enriched = enrichFoodImages(foods);
    const needsWrite = enriched.some((f, i) => f.image !== foods[i]?.image);
    if (needsWrite) writeJson(FOODS_KEY, enriched);
    return enriched;
  },

  setFoods(foods: AdminFood[]) {
    writeJson(FOODS_KEY, foods);
  },

  importSiteMenu(): { foods: AdminFood[]; categories: AdminCategory[] } {
    const foods = seedFoods();
    const categories = seedCategories();
    this.setFoods(foods);
    this.setCategories(categories);
    localStorage.setItem(MENU_VERSION_KEY, MENU_SEED_VERSION);
    return { foods, categories };
  },

  addFood(food: Omit<AdminFood, 'id'> & { id?: string }) {
    const foods = this.getFoods();
    const created: AdminFood = {
      ...food,
      id: food.id ?? generateId(),
      isAvailable: food.isAvailable ?? true,
    };
    this.setFoods([created, ...foods]);
    return created;
  },

  updateFood(id: string, patch: Partial<AdminFood>) {
    const foods = this.getFoods().map((f) => (f.id === id ? { ...f, ...patch } : f));
    this.setFoods(foods);
    return foods.find((f) => f.id === id)!;
  },

  deleteFood(id: string) {
    this.setFoods(this.getFoods().filter((f) => f.id !== id));
  },

  getCategories(): AdminCategory[] {
    ensureLatestMenuSeed();
    const cats = readJson<AdminCategory[] | null>(CATEGORIES_KEY, null);
    if (!cats?.length) return [];
    const enriched = cats.map((c) => ({
      ...c,
      image: isCustomUpload(c.image) ? c.image! : getFoodImageUrl('', c.slug),
      sortOrder: c.sortOrder ?? 0,
      foodCount: this.getFoods().filter((f) => f.category.slug === c.slug).length,
    }));
    const needsWrite = enriched.some((c, i) => c.image !== cats[i]?.image);
    if (needsWrite) writeJson(CATEGORIES_KEY, enriched);
    return enriched;
  },

  setCategories(categories: AdminCategory[]) {
    writeJson(CATEGORIES_KEY, categories);
  },

  addCategory(input: Omit<AdminCategory, 'id' | 'foodCount'> & { id?: string }) {
    const cats = this.getCategories();
    const created: AdminCategory = {
      ...input,
      id: input.id ?? generateId(),
      foodCount: 0,
      sortOrder: input.sortOrder ?? cats.length + 1,
    };
    this.setCategories([created, ...cats]);
    return created;
  },

  updateCategory(id: string, patch: Partial<AdminCategory>) {
    const cats = this.getCategories().map((c) => (c.id === id ? { ...c, ...patch } : c));
    this.setCategories(cats);
    return cats.find((c) => c.id === id)!;
  },

  deleteCategory(id: string) {
    this.setCategories(this.getCategories().filter((c) => c.id !== id));
  },
};
