import type { Food } from '../types';

type MenuSeed = {
  name: string;
  slug: string;
  category: string;
  categoryName: string;
  description: string;
  price: number;
  isPopular?: boolean;
  isNew?: boolean;
};

const MENU_SEEDS: MenuSeed[] = [
  // Rice
  { name: 'Jollof Rice', slug: 'jollof-rice', category: 'rice', categoryName: 'Rice', description: 'Smoky party-style jollof with rich tomato base', price: 1200, isPopular: true },
  { name: 'Fried Rice', slug: 'fried-rice', category: 'rice', categoryName: 'Rice', description: 'Colorful Nigerian fried rice with mixed vegetables', price: 1100, isPopular: true },
  { name: 'Ofada Rice & Ayamase', slug: 'ofada-rice', category: 'rice', categoryName: 'Rice', description: 'Local ofada rice served with spicy ayamase sauce', price: 1500 },
  { name: 'White Rice', slug: 'white-rice', category: 'rice', categoryName: 'Rice', description: 'Steamed long grain white rice', price: 800 },
  { name: 'Coconut Rice', slug: 'coconut-rice', category: 'rice', categoryName: 'Rice', description: 'Fragrant coconut-infused rice', price: 1300 },
  { name: 'Native Jollof Rice', slug: 'native-jollof', category: 'rice', categoryName: 'Rice', description: 'Traditional pot jollof with local spices', price: 1400, isPopular: true },
  // Swallow
  { name: 'Amala', slug: 'amala', category: 'swallow', categoryName: 'Swallow', description: 'Smooth yam flour swallow', price: 900, isPopular: true },
  { name: 'Eba', slug: 'eba', category: 'swallow', categoryName: 'Swallow', description: 'Classic garri swallow', price: 700 },
  { name: 'Pounded Yam', slug: 'pounded-yam', category: 'swallow', categoryName: 'Swallow', description: 'Soft hand-pounded yam', price: 1200, isPopular: true },
  { name: 'Semovita', slug: 'semovita', category: 'swallow', categoryName: 'Swallow', description: 'Light semolina swallow', price: 800 },
  { name: 'Fufu', slug: 'fufu', category: 'swallow', categoryName: 'Swallow', description: 'Traditional cassava fufu', price: 750 },
  { name: 'Wheat Swallow', slug: 'wheat-swallow', category: 'swallow', categoryName: 'Swallow', description: 'Soft wheat meal swallow', price: 850 },
  { name: 'Starch', slug: 'starch', category: 'swallow', categoryName: 'Swallow', description: 'Delta-style starch swallow', price: 900 },
  // Soups
  { name: 'Egusi Soup', slug: 'egusi-soup', category: 'soup', categoryName: 'Soup', description: 'Rich melon seed soup with leafy greens', price: 1800, isPopular: true },
  { name: 'Efo Riro', slug: 'efo-riro', category: 'soup', categoryName: 'Soup', description: 'Spinach stew with assorted meat', price: 1700, isPopular: true },
  { name: 'Okra Soup', slug: 'okra-soup', category: 'soup', categoryName: 'Soup', description: 'Draw soup with fresh okra', price: 1600 },
  { name: 'Pepper Soup', slug: 'pepper-soup', category: 'soup', categoryName: 'Soup', description: 'Spicy aromatic broth with herbs', price: 2000, isPopular: true },
  { name: 'Ogbono Soup', slug: 'ogbono-soup', category: 'soup', categoryName: 'Soup', description: 'Wild mango seed draw soup', price: 1650 },
  { name: 'Bitterleaf Soup', slug: 'bitterleaf-soup', category: 'soup', categoryName: 'Soup', description: 'Traditional onugbu soup', price: 1750 },
  { name: 'Banga Soup', slug: 'banga-soup', category: 'soup', categoryName: 'Soup', description: 'Palm nut soup with fresh fish', price: 1900 },
  { name: 'Oha Soup', slug: 'oha-soup', category: 'soup', categoryName: 'Soup', description: 'Igbo-style oha leaf soup', price: 1850 },
  { name: 'Edikaikong', slug: 'edikaikong', category: 'soup', categoryName: 'Soup', description: 'Mixed vegetable soup with assorted meat', price: 1800 },
  // Proteins
  { name: 'Grilled Chicken', slug: 'grilled-chicken', category: 'proteins', categoryName: 'Proteins', description: 'Marinated flame-grilled chicken', price: 2500, isPopular: true },
  { name: 'Beef Suya', slug: 'beef-suya', category: 'proteins', categoryName: 'Proteins', description: 'Spicy grilled beef skewers', price: 2000, isPopular: true },
  { name: 'Goat Meat Pepper Soup', slug: 'goat-meat', category: 'proteins', categoryName: 'Proteins', description: 'Tender peppered goat meat', price: 2800 },
  { name: 'Grilled Catfish', slug: 'grilled-fish', category: 'proteins', categoryName: 'Proteins', description: 'Whole grilled catfish', price: 3500 },
  { name: 'Moi Moi', slug: 'moi-moi', category: 'proteins', categoryName: 'Proteins', description: 'Steamed bean pudding with egg', price: 800 },
  { name: 'Beans Porridge', slug: 'beans-porridge', category: 'proteins', categoryName: 'Proteins', description: 'Slow-cooked Nigerian beans', price: 1000 },
  { name: 'Turkey Wings', slug: 'turkey-wings', category: 'proteins', categoryName: 'Proteins', description: 'Seasoned roasted turkey wings', price: 2200 },
  { name: 'Nkwobi', slug: 'nkwobi', category: 'proteins', categoryName: 'Proteins', description: 'Spicy cow foot delicacy', price: 3200, isNew: true },
  { name: 'Fried Chicken (2 Pieces)', slug: 'fried-chicken-2', category: 'proteins', categoryName: 'Proteins', description: 'Crispy fried chicken pieces', price: 2200 },
  // Breakfast
  { name: 'Akara (4pcs)', slug: 'akara', category: 'breakfast', categoryName: 'Breakfast', description: 'Crispy bean fritters', price: 800 },
  { name: 'Pap & Akara', slug: 'pap-akara', category: 'breakfast', categoryName: 'Breakfast', description: 'Traditional pap with akara', price: 1000, isPopular: true },
  { name: 'Yam & Egg Sauce', slug: 'yam-egg-sauce', category: 'breakfast', categoryName: 'Breakfast', description: 'Boiled yam with tomato egg sauce', price: 1500 },
  { name: 'Bread & Egg', slug: 'bread-egg', category: 'breakfast', categoryName: 'Breakfast', description: 'Toasted bread with fried eggs', price: 1200 },
  // Extras & sides
  { name: 'Fried Plantain (Dodo)', slug: 'fried-plantain', category: 'extras', categoryName: 'Extras', description: 'Sweet fried plantain slices', price: 600, isPopular: true },
  { name: 'Coleslaw', slug: 'coleslaw', category: 'extras', categoryName: 'Extras', description: 'Fresh creamy coleslaw', price: 500 },
  { name: 'Garden Salad', slug: 'garden-salad', category: 'extras', categoryName: 'Extras', description: 'Mixed greens with dressing', price: 700 },
  // Snacks & fast food
  { name: 'Chicken Shawarma', slug: 'shawarma', category: 'snacks', categoryName: 'Snacks', description: 'Chicken shawarma wrap', price: 2500, isPopular: true },
  { name: 'Meat Pie', slug: 'meat-pie', category: 'snacks', categoryName: 'Snacks', description: 'Flaky pastry with minced beef', price: 800 },
  { name: 'Puff Puff (6pcs)', slug: 'puff-puff', category: 'snacks', categoryName: 'Snacks', description: 'Golden fried dough balls', price: 500 },
  { name: 'Boli & Groundnut', slug: 'boli-groundnut', category: 'snacks', categoryName: 'Snacks', description: 'Roasted plantain with groundnut', price: 600 },
  // Drinks
  { name: 'Chapman', slug: 'chapman', category: 'drinks', categoryName: 'Drinks', description: 'Nigerian fruit punch cocktail', price: 1500, isPopular: true },
  { name: 'Zobo', slug: 'zobo', category: 'drinks', categoryName: 'Drinks', description: 'Hibiscus drink with spices', price: 800 },
  { name: 'Fresh Orange Juice', slug: 'orange-juice', category: 'drinks', categoryName: 'Drinks', description: 'Freshly squeezed orange juice', price: 1200 },
  { name: 'Malt Drink', slug: 'malt-drink', category: 'drinks', categoryName: 'Drinks', description: 'Chilled malt beverage', price: 600 },
  { name: 'Soft Drink', slug: 'soft-drink', category: 'drinks', categoryName: 'Drinks', description: 'Coca-Cola, Pepsi or Fanta', price: 500 },
  { name: 'Bottled Water', slug: 'bottled-water', category: 'drinks', categoryName: 'Drinks', description: '500ml still water', price: 300 },
];

function toFood(seed: MenuSeed): Food {
  return {
    id: seed.slug,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    tags: seed.isPopular ? 'popular' : '',
    isPopular: seed.isPopular ?? false,
    isNew: seed.isNew ?? false,
    prepTimeMinutes: 25,
    category: { name: seed.categoryName, slug: seed.category },
    portions: [
      {
        id: `${seed.slug}-medium`,
        price: seed.price,
        portion: { id: 'medium', name: 'Medium', slug: 'medium' },
      },
    ],
  };
}

export const NIGERIAN_MENU_FOODS: Food[] = MENU_SEEDS.map(toFood);

export const MENU_CATEGORIES = [
  { id: 'rice', name: 'Rice', slug: 'rice' },
  { id: 'swallow', name: 'Swallow', slug: 'swallow' },
  { id: 'soup', name: 'Soups', slug: 'soup' },
  { id: 'proteins', name: 'Proteins', slug: 'proteins' },
  { id: 'breakfast', name: 'Breakfast', slug: 'breakfast' },
  { id: 'snacks', name: 'Snacks & Fast Food', slug: 'snacks' },
  { id: 'drinks', name: 'Drinks', slug: 'drinks' },
  { id: 'extras', name: 'Extras', slug: 'extras' },
];

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
