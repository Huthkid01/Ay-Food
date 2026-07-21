/** Food image URLs — hero uses local A.Y Food Palace photos; menu items use Unsplash */

const params = 'auto=format&fit=crop&w=800&h=600&q=80';

export const HERO_IMAGE = '/assets/hero.png';
export const HERO_INTERIOR_1 = '/assets/hero-interior-1.png';
export const HERO_INTERIOR_2 = '/assets/hero-interior-2.png';

export interface HeroSlide {
  image: string;
  tagline: string;
  title: string;
  highlight?: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta: { label: string; to: string };
  /** Fine-tune crop for wide hero banners */
  imagePosition?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: HERO_IMAGE,
    tagline: 'Local food at its best',
    title: 'Ay',
    highlight: 'Food',
    description:
      'Build your perfect meal pack with authentic Nigerian cuisine. Choose your rice, swallow, soup, proteins and more — customized to your taste.',
    primaryCta: { label: 'Build Your Pack', to: '/build' },
    secondaryCta: { label: 'Browse Menu', to: '/menu' },
    imagePosition: '70% center',
  },
  {
    image: HERO_INTERIOR_1,
    tagline: 'Dine in with us',
    title: 'Vibrant Dining,',
    highlight: 'Authentic Flavours',
    description:
      'Enjoy fresh Nigerian meals in our colourful Ogijo restaurant — great food, great atmosphere, and a welcome you’ll feel the moment you walk in.',
    primaryCta: { label: 'Browse Menu', to: '/menu' },
    secondaryCta: { label: 'Build Your Pack', to: '/build' },
  },
  {
    image: HERO_INTERIOR_2,
    tagline: 'Ogijo · Ikorodu · Lagos',
    title: 'Order Hot Meals',
    highlight: 'To Your Door',
    description:
      'Same kitchen, same taste — delivered across Ogijo and Ikorodu. Browse the menu, add to cart, and checkout in minutes. No account needed.',
    primaryCta: { label: 'Start Ordering', to: '/menu' },
    secondaryCta: { label: 'Track Order', to: '/track' },
  },
];

export const DEFAULT_FOOD_IMAGE =
  `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?${params}`;

const CATEGORY_IMAGES: Record<string, string> = {
  rice: `https://images.unsplash.com/photo-1586201375770-54d07c1a5619?${params}`,
  swallow: `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  soup: `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  proteins: `https://images.unsplash.com/photo-1604908177456-04039589c13e?${params}`,
  drinks: `https://images.unsplash.com/photo-1544145945-f904253840c7?${params}`,
  snacks: `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?${params}`,
  desserts: `https://images.unsplash.com/photo-1551024506-0bccd281d577?${params}`,
  extras: `https://images.unsplash.com/photo-1512621776951-a57141f2eefd?${params}`,
  breakfast: `https://images.unsplash.com/photo-1525351484163-7529414344d8?${params}`,
};

const FOOD_IMAGES: Record<string, string> = {
  'jollof-rice': `https://images.unsplash.com/photo-1516684669134-de6f7c4734bf?${params}`,
  'fried-rice': `https://images.unsplash.com/photo-160313387287-876f04eb551b?${params}`,
  'ofada-rice': `https://images.unsplash.com/photo-1586201375770-54d07c1a5619?${params}`,
  'coconut-rice': `https://images.unsplash.com/photo-1534422298390-5784a804b764?${params}`,
  'grilled-chicken': `https://images.unsplash.com/photo-1598103442097-256743ae4226?${params}`,
  'fried-chicken-1': `https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?${params}`,
  'fried-chicken-2': `https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?${params}`,
  'fried-chicken-3': `https://images.unsplash.com/photo-1562967916-eb82221dfb92?${params}`,
  'beef-suya': `https://images.unsplash.com/photo-1529193591184-b1d58069-72b?${params}`,
  'grilled-fish': `https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?${params}`,
  'shawarma': `https://images.unsplash.com/photo-1529003605782-b1131658182f?${params}`,
  'burger': `https://images.unsplash.com/photo-1568901346835-4c7d7a4c4f8d?${params}`,
  'pizza-margherita': `https://images.unsplash.com/photo-1574071318508-1cdbab80d002?${params}`,
  'pasta-alfredo': `https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?${params}`,
  'fried-plantain': `https://images.unsplash.com/photo-1603048297172-c92544798d5a?${params}`,
  'garden-salad': `https://images.unsplash.com/photo-1512621776951-a57141f2eefd?${params}`,
  'coleslaw': `https://images.unsplash.com/photo-1623428187425-52470f9a2c7a?${params}`,
  'chapman': `https://images.unsplash.com/photo-1544145945-f904253840c7?${params}`,
  'orange-juice': `https://images.unsplash.com/photo-1621506289937-a682ef3a576f?${params}`,
  'smoothie-bowl': `https://images.unsplash.com/photo-1590301157890-4810ed352733?${params}`,
  'fruit-salad': `https://images.unsplash.com/photo-1564093497595-59396f913dc9?${params}`,
  'ice-cream': `https://images.unsplash.com/photo-1563805042-7684c019e1cb?${params}`,
  'puff-puff': `https://images.unsplash.com/photo-1486427944299-d1955d23a34f?${params}`,
  'meat-pie': `https://images.unsplash.com/photo-1607925997314-09827c4a6b30?${params}`,
  'egusi-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'pepper-soup': `https://images.unsplash.com/photo-1604908177522-402147483e8e?${params}`,
  'moi-moi': `https://images.unsplash.com/photo-1585032226651-759b368d7246?${params}`,
  'beans-porridge': `https://images.unsplash.com/photo-1543339498-b600cd4b5685?${params}`,
  'yam-egg-sauce': `https://images.unsplash.com/photo-1596797038530-2c107229654b?${params}`,
  'bread-egg': `https://images.unsplash.com/photo-1525351484163-7529414344d8?${params}`,
  'white-rice': `https://images.unsplash.com/photo-1586201375770-54d07c1a5619?${params}`,
  'native-jollof': `https://images.unsplash.com/photo-1516684669134-de6f7c4734bf?${params}`,
  'eba': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'semovita': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'fufu': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'wheat-swallow': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'starch': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'amala': `https://images.unsplash.com/photo-1604329760661-e71dc83f8b26?${params}`,
  'efo-riro': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'okra-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'ogbono-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'bitterleaf-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'banga-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'oha-soup': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'edikaikong': `https://images.unsplash.com/photo-1547592166-23ac45744acd?${params}`,
  'goat-meat': `https://images.unsplash.com/photo-1529193591184-b1d58069-72b?${params}`,
  'turkey-wings': `https://images.unsplash.com/photo-1598103442097-256743ae4226?${params}`,
  'nkwobi': `https://images.unsplash.com/photo-1529193591184-b1d58069-72b?${params}`,
  'akara': `https://images.unsplash.com/photo-1585032226651-759b368d7246?${params}`,
  'pap-akara': `https://images.unsplash.com/photo-1525351484163-7529414344d8?${params}`,
  'boli-groundnut': `https://images.unsplash.com/photo-1603048297172-c92544798d5a?${params}`,
  'zobo': `https://images.unsplash.com/photo-1544145945-f904253840c7?${params}`,
  'malt-drink': `https://images.unsplash.com/photo-1544145945-f904253840c7?${params}`,
  'soft-drink': `https://images.unsplash.com/photo-1622483767028-3f66f32aef97?${params}`,
  'bottled-water': `https://images.unsplash.com/photo-1548839140-29a749299164?${params}`,
};

export function getFoodImageUrl(slug: string, category: string): string {
  return FOOD_IMAGES[slug] ?? CATEGORY_IMAGES[category] ?? DEFAULT_FOOD_IMAGE;
}

export function resolveFoodImage(food: {
  image?: string | null;
  slug: string;
  category?: { slug: string };
}): string {
  if (food.image?.startsWith('http')) return food.image;
  return getFoodImageUrl(food.slug, food.category?.slug ?? 'extras');
}
