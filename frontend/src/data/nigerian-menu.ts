import type { Food, FoodPortion } from '../types';
import { getFoodImageUrl } from '../utils/food-images';
import { formatCurrency, slugify } from '../utils/helpers';

type PortionSeed = { name: string; price: number };

type MenuSeed = {
  name: string;
  slug: string;
  category: string;
  categoryName: string;
  description: string;
  /** Single price (standard size). Ignored when `portions` is set. */
  price?: number;
  portions?: PortionSeed[];
  isPopular?: boolean;
  isNew?: boolean;
};

/**
 * Official A.Y Food Mega Palace menu (flyer).
 * Categories: Swallow · Meals · Protein · Sides · Soups
 */
const MENU_SEEDS: MenuSeed[] = [
  // —— Swallow ——
  { name: 'Amala', slug: 'amala', category: 'swallow', categoryName: 'Swallow', description: 'Smooth yam flour swallow', price: 500, isPopular: true },
  { name: 'Eba', slug: 'eba', category: 'swallow', categoryName: 'Swallow', description: 'Classic garri swallow', price: 500 },
  { name: 'Semo', slug: 'semo', category: 'swallow', categoryName: 'Swallow', description: 'Light semolina swallow', price: 500 },
  { name: 'Pounded Yam', slug: 'pounded-yam', category: 'swallow', categoryName: 'Swallow', description: 'Soft pounded yam', price: 500, isPopular: true },

  // —— Meals ——
  { name: 'Jollof Rice', slug: 'jollof-rice', category: 'meals', categoryName: 'Meals', description: 'Party-style Nigerian jollof', price: 500, isPopular: true },
  { name: 'Fried Rice', slug: 'fried-rice', category: 'meals', categoryName: 'Meals', description: 'Nigerian fried rice', price: 500, isPopular: true },
  { name: 'Ofada Rice', slug: 'ofada-rice', category: 'meals', categoryName: 'Meals', description: 'Local ofada rice', price: 500 },
  { name: 'Beans', slug: 'beans', category: 'meals', categoryName: 'Meals', description: 'Well-cooked Nigerian beans', price: 500 },
  { name: 'Spaghetti', slug: 'spaghetti', category: 'meals', categoryName: 'Meals', description: 'Savory spaghetti', price: 500 },
  { name: 'Porridge Yam', slug: 'porridge-yam', category: 'meals', categoryName: 'Meals', description: 'Yam porridge', price: 500 },
  { name: 'Yam', slug: 'yam', category: 'meals', categoryName: 'Meals', description: 'Boiled or fried yam', price: 500 },
  { name: 'Special Rice', slug: 'special-rice', category: 'meals', categoryName: 'Meals', description: 'Chef special rice', price: 1000, isPopular: true },

  // —— Protein (multi-size prices from flyer) ——
  { name: 'Goat Meat', slug: 'goat-meat', category: 'protein', categoryName: 'Protein', description: 'Tender goat meat', price: 2000, isPopular: true },
  { name: 'Beef', slug: 'beef', category: 'protein', categoryName: 'Protein', description: 'Seasoned beef', price: 500 },
  { name: 'Ponmo', slug: 'ponmo', category: 'protein', categoryName: 'Protein', description: 'Soft cow skin', price: 500 },
  { name: 'Egg', slug: 'egg', category: 'protein', categoryName: 'Protein', description: 'Fried or boiled egg', price: 400 },
  {
    name: 'Turkey',
    slug: 'turkey',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Whole turkey — choose size',
    portions: [
      { name: 'Regular', price: 5500 },
      { name: 'Large', price: 6000 },
    ],
    isPopular: true,
  },
  {
    name: 'Chicken',
    slug: 'chicken',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Whole chicken — choose size',
    portions: [
      { name: 'Regular', price: 4500 },
      { name: 'Large', price: 5000 },
    ],
    isPopular: true,
  },
  {
    name: 'Wings / Laps',
    slug: 'wings-laps',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Chicken wings or laps',
    portions: [
      { name: 'Small', price: 2000 },
      { name: 'Medium', price: 2500 },
      { name: 'Large', price: 3000 },
    ],
  },
  {
    name: 'Hake Fish',
    slug: 'hake-fish',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Fresh hake fish',
    portions: [
      { name: 'Size 1', price: 2000 },
      { name: 'Size 2', price: 2500 },
      { name: 'Size 3', price: 3000 },
      { name: 'Size 4', price: 4000 },
    ],
  },
  {
    name: 'Titus Fish',
    slug: 'titus-fish',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Titus (mackerel) fish',
    portions: [
      { name: 'Size 1', price: 2000 },
      { name: 'Size 2', price: 2500 },
      { name: 'Size 3', price: 3000 },
      { name: 'Size 4', price: 3500 },
    ],
  },
  {
    name: 'Fresh Fish',
    slug: 'fresh-fish',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Fresh fish — choose size',
    portions: [
      { name: 'Size 1', price: 3000 },
      { name: 'Size 2', price: 4000 },
      { name: 'Size 3', price: 5000 },
    ],
  },
  {
    name: 'Cat Fish',
    slug: 'cat-fish',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Catfish',
    portions: [
      { name: 'Regular', price: 2000 },
      { name: 'Large', price: 3000 },
    ],
  },
  {
    name: 'Gizzard',
    slug: 'gizzard',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Peppered gizzard',
    portions: [
      { name: 'Regular', price: 1000 },
      { name: 'Large', price: 1500 },
    ],
  },
  {
    name: 'Panla Kika',
    slug: 'panla-kika',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Dried panla fish',
    portions: [
      { name: 'Regular', price: 1000 },
      { name: 'Large', price: 1500 },
    ],
  },
  {
    name: 'Brokoto',
    slug: 'brokoto',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Assorted brokoto',
    portions: [
      { name: 'Regular', price: 2500 },
      { name: 'Large', price: 3000 },
    ],
  },
  {
    name: 'Snail',
    slug: 'snail',
    category: 'protein',
    categoryName: 'Protein',
    description: 'Peppered snail',
    portions: [
      { name: 'Small', price: 1000 },
      { name: 'Medium', price: 1500 },
      { name: 'Large', price: 4000 },
    ],
  },

  // —— Sides ——
  {
    name: 'Plantain',
    slug: 'plantain',
    category: 'sides',
    categoryName: 'Sides',
    description: 'Fried plantain — seasonal price (confirm when ordering)',
    portions: [{ name: 'Seasonal', price: 0 }],
    isPopular: true,
  },
  { name: 'Moi Moi', slug: 'moi-moi', category: 'sides', categoryName: 'Sides', description: 'Steamed bean pudding', price: 600 },
  { name: 'Salad', slug: 'salad', category: 'sides', categoryName: 'Sides', description: 'Fresh garden salad', price: 700 },

  // —— Soups (listed on flyer without fixed prices — confirm with kitchen) ——
  {
    name: 'Ewedu',
    slug: 'ewedu',
    category: 'soups',
    categoryName: 'Soups',
    description: 'Draw soup — pair with swallow; confirm price when ordering',
    portions: [{ name: 'With swallow', price: 0 }],
  },
  {
    name: 'Gbegiri',
    slug: 'gbegiri',
    category: 'soups',
    categoryName: 'Soups',
    description: 'Bean soup — pair with swallow; confirm price when ordering',
    portions: [{ name: 'With swallow', price: 0 }],
  },
  {
    name: 'Egusi',
    slug: 'egusi',
    category: 'soups',
    categoryName: 'Soups',
    description: 'Melon seed soup — pair with swallow; confirm price when ordering',
    portions: [{ name: 'With swallow', price: 0 }],
    isPopular: true,
  },
  {
    name: 'Okro',
    slug: 'okro',
    category: 'soups',
    categoryName: 'Soups',
    description: 'Okra soup — pair with swallow; confirm price when ordering',
    portions: [{ name: 'With swallow', price: 0 }],
  },
  {
    name: 'Efo Riro',
    slug: 'efo-riro',
    category: 'soups',
    categoryName: 'Soups',
    description: 'Vegetable stew — pair with swallow; confirm price when ordering',
    portions: [{ name: 'With swallow', price: 0 }],
    isPopular: true,
  },
];

function toPortions(seed: MenuSeed): FoodPortion[] {
  const list =
    seed.portions ??
    (seed.price !== undefined
      ? [{ name: 'Standard', price: seed.price }]
      : [{ name: 'Standard', price: 0 }]);

  return list.map((p) => {
    const portionSlug = slugify(p.name);
    return {
      id: `${seed.slug}-${portionSlug}`,
      price: p.price,
      portion: { id: portionSlug, name: p.name, slug: portionSlug },
    };
  });
}

function toFood(seed: MenuSeed): Food {
  return {
    id: seed.slug,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    image: getFoodImageUrl(seed.slug, seed.category),
    tags: seed.isPopular ? 'popular' : '',
    isPopular: seed.isPopular ?? false,
    isNew: seed.isNew ?? false,
    prepTimeMinutes: 25,
    category: { name: seed.categoryName, slug: seed.category },
    portions: toPortions(seed),
  };
}

export const NIGERIAN_MENU_FOODS: Food[] = MENU_SEEDS.map(toFood);

/** Bump when the official flyer menu changes so local admin catalogs reseed. */
export const MENU_SEED_VERSION = 'ay-flyer-v1';

export const MENU_CATEGORIES = [
  { id: 'swallow', name: 'Swallow', slug: 'swallow' },
  { id: 'meals', name: 'Meals', slug: 'meals' },
  { id: 'protein', name: 'Protein', slug: 'protein' },
  { id: 'sides', name: 'Sides', slug: 'sides' },
  { id: 'soups', name: 'Soups', slug: 'soups' },
];

/** Display price or range; ₦0 (free) items still show as currency so totals stay clear. */
export function formatMenuPrice(portions: FoodPortion[]): string {
  if (portions.length === 0) return formatCurrency(0);
  const prices = portions.map((p) => p.price).filter((p) => Number.isFinite(p) && p >= 0);
  if (prices.length === 0) return formatCurrency(0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatCurrency(min);
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

export function filterMenuFoods(foods: Food[], category: string, search: string): Food[] {
  let list = foods;
  if (category) {
    list = list.filter((f) => f.category.slug === category);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.category.name.toLowerCase().includes(q)
    );
  }
  return list;
}
