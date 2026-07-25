import { isSupabaseConfigured } from '../lib/supabase';
import { adminRpc } from '../lib/admin-rpc';
import { adminStore, type AdminCategory, type AdminFood } from './admin-store';
import { MENU_CATEGORIES, NIGERIAN_MENU_FOODS } from '../data/nigerian-menu';
import { generateId, slugify } from '../utils/helpers';
import { getFoodImageUrl } from '../utils/food-images';

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  foods?: { count: number }[] | null;
}): AdminCategory {
  const count = Array.isArray(row.foods) ? (row.foods[0] as { count?: number })?.count : undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    foodCount: typeof count === 'number' ? count : 0,
  };
}

function mapFood(row: {
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
}): AdminFood {
  const portions = (row.food_portions ?? []).map((p) => ({
    id: p.id,
    price: p.price,
    portion: { id: p.id, name: p.portion_name, slug: slugify(p.portion_name) },
  }));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    tags: row.tags ?? '',
    isPopular: row.is_popular,
    isNew: row.is_new,
    isAvailable: row.is_available,
    prepTimeMinutes: row.prep_time_minutes,
    category: {
      name: row.categories?.name ?? 'Uncategorized',
      slug: row.categories?.slug ?? 'uncategorized',
    },
    portions:
      portions.length > 0
        ? portions
        : [
            {
              id: `${row.id}-medium`,
              price: 0,
              portion: { id: 'medium', name: 'Medium', slug: 'medium' },
            },
          ],
  };
}

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
};

export type FoodInput = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  price: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNew: boolean;
  prepTimeMinutes: number;
};

export const categoryAdminService = {
  async list(): Promise<AdminCategory[]> {
    if (isSupabaseConfigured()) {
      const data = await adminRpc<unknown[]>('admin_list_categories');
      return Array.isArray(data) ? data.map((row) => mapCategory(row as never)) : [];
    }
    return adminStore.getCategories();
  },

  async create(input: CategoryInput): Promise<AdminCategory> {
    if (isSupabaseConfigured()) {
      const data = await adminRpc('admin_upsert_category', {
        p_category: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? '',
          image: input.image ?? '',
          sort_order: input.sortOrder,
          is_active: input.isActive,
        },
      });
      return mapCategory(data as never);
    }
    return adminStore.addCategory({
      name: input.name,
      slug: input.slug,
      description: input.description,
      image: input.image,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
  },

  async update(id: string, input: Partial<CategoryInput>): Promise<AdminCategory> {
    if (isSupabaseConfigured()) {
      const payload: Record<string, unknown> = { id };
      if (input.name !== undefined) payload.name = input.name;
      if (input.slug !== undefined) payload.slug = input.slug;
      if (input.description !== undefined) payload.description = input.description;
      if (input.image !== undefined) payload.image = input.image;
      if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
      if (input.isActive !== undefined) payload.is_active = input.isActive;

      const data = await adminRpc('admin_upsert_category', { p_category: payload });
      return mapCategory(data as never);
    }
    return adminStore.updateCategory(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
  },

  async remove(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await adminRpc('admin_delete_category', { p_id: id });
      return;
    }
    adminStore.deleteCategory(id);
  },
};

export const foodAdminService = {
  async list(): Promise<AdminFood[]> {
    if (isSupabaseConfigured()) {
      const data = await adminRpc<unknown[]>('admin_list_foods');
      return Array.isArray(data) ? data.map((row) => mapFood(row as never)) : [];
    }
    return adminStore.getFoods();
  },

  async create(input: FoodInput): Promise<AdminFood> {
    if (isSupabaseConfigured()) {
      const data = await adminRpc('admin_upsert_food', {
        p_food: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? '',
          image: input.image ?? '',
          category_id: input.categoryId,
          price: input.price,
          is_available: input.isAvailable,
          is_popular: input.isPopular,
          is_new: input.isNew,
          prep_time_minutes: input.prepTimeMinutes,
          tags: input.isPopular ? 'popular' : '',
        },
      });
      return mapFood(data as never);
    }

    return adminStore.addFood({
      id: generateId(),
      name: input.name,
      slug: input.slug,
      description: input.description,
      image: input.image,
      tags: input.isPopular ? 'popular' : '',
      isPopular: input.isPopular,
      isNew: input.isNew,
      isAvailable: input.isAvailable,
      prepTimeMinutes: input.prepTimeMinutes,
      category: { name: input.categoryName, slug: input.categorySlug },
      portions: [
        {
          id: `${input.slug}-medium`,
          price: input.price,
          portion: { id: 'medium', name: 'Medium', slug: 'medium' },
        },
      ],
    });
  },

  async update(id: string, input: Partial<FoodInput> & { portionId?: string }): Promise<AdminFood> {
    if (isSupabaseConfigured()) {
      const payload: Record<string, unknown> = { id };
      if (input.name !== undefined) payload.name = input.name;
      if (input.slug !== undefined) payload.slug = input.slug;
      if (input.description !== undefined) payload.description = input.description;
      if (input.image !== undefined) payload.image = input.image;
      if (input.categoryId !== undefined) payload.category_id = input.categoryId;
      if (input.isAvailable !== undefined) payload.is_available = input.isAvailable;
      if (input.isPopular !== undefined) {
        payload.is_popular = input.isPopular;
        payload.tags = input.isPopular ? 'popular' : '';
      }
      if (input.isNew !== undefined) payload.is_new = input.isNew;
      if (input.prepTimeMinutes !== undefined) payload.prep_time_minutes = input.prepTimeMinutes;
      if (input.price !== undefined) payload.price = input.price;

      const data = await adminRpc('admin_upsert_food', { p_food: payload });
      return mapFood(data as never);
    }

    const existing = adminStore.getFoods().find((f) => f.id === id);
    const portions = existing?.portions ?? [];
    const nextPortions =
      input.price !== undefined && portions[0]
        ? [{ ...portions[0], price: input.price }, ...portions.slice(1)]
        : portions;

    return adminStore.updateFood(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      ...(input.isPopular !== undefined && { isPopular: input.isPopular }),
      ...(input.isNew !== undefined && { isNew: input.isNew }),
      ...(input.prepTimeMinutes !== undefined && { prepTimeMinutes: input.prepTimeMinutes }),
      ...(input.categoryName &&
        input.categorySlug && {
          category: { name: input.categoryName, slug: input.categorySlug },
        }),
      ...(input.price !== undefined && { portions: nextPortions }),
    });
  },

  async remove(id: string): Promise<{ archived: boolean }> {
    if (isSupabaseConfigured()) {
      const data = await adminRpc<{ archived?: boolean }>('admin_delete_food', { p_id: id });
      return { archived: Boolean(data?.archived) };
    }
    adminStore.deleteFood(id);
    return { archived: false };
  },
};

/** Push the official flyer menu into Supabase (upsert by slug). */
export async function importFlyerMenuToDatabase(): Promise<{
  categories: number;
  foods: number;
}> {
  if (!isSupabaseConfigured()) {
    const local = adminStore.importSiteMenu();
    return { categories: local.categories.length, foods: local.foods.length };
  }

  const categories = MENU_CATEGORIES.map((c, i) => ({
    name: c.name,
    slug: c.slug,
    description: '',
    image: getFoodImageUrl('', c.slug),
    sort_order: i + 1,
    is_active: true,
  }));

  const foods = NIGERIAN_MENU_FOODS.map((f) => ({
    name: f.name,
    slug: f.slug,
    description: f.description ?? '',
    image: f.image ?? getFoodImageUrl(f.slug, f.category.slug),
    category_slug: f.category.slug,
    is_available: true,
    is_popular: f.isPopular,
    is_new: f.isNew,
    prep_time_minutes: f.prepTimeMinutes ?? 25,
    tags: f.tags ?? '',
    portions: f.portions.map((p) => ({
      portion_name: p.portion.name,
      price: p.price,
      is_available: true,
    })),
  }));

  const row = await adminRpc<{ categories?: number; foods?: number }>('admin_import_flyer_menu', {
    p_categories: categories,
    p_foods: foods,
  });

  return {
    categories: Number(row.categories ?? 0),
    foods: Number(row.foods ?? 0),
  };
}
