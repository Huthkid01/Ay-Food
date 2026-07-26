/** Food image URLs — hero uses local palace photos; menu uses optimized Unsplash CDN images */

export type UnsplashSize = 'thumb' | 'card' | 'large';

const SIZE_PRESETS: Record<UnsplashSize, { w: number; h: number; q: number }> = {
  /** Admin list / tiny avatars */
  thumb: { w: 96, h: 96, q: 60 },
  /** Menu / home food cards */
  card: { w: 480, h: 360, q: 72 },
  /** Rare zoom / larger tiles */
  large: { w: 720, h: 540, q: 75 },
};

/** Build a compressed Unsplash CDN URL (WebP when supported via auto=format + fm=webp). */
export function buildUnsplashUrl(photoId: string, size: UnsplashSize = 'card'): string {
  const { w, h, q } = SIZE_PRESETS[size];
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=${q}&fm=webp`;
}

/** Tiny blur placeholder for progressive paint (~1–2 KB). */
export function buildUnsplashBlur(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=24&h=18&q=30&blur=40&fm=webp`;
}

/**
 * Rewrite any Unsplash URL to a smaller/faster size.
 * Also upgrades old 800px links saved in localStorage.
 */
export function optimizeUnsplashUrl(url: string, size: UnsplashSize = 'card'): string {
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const parsed = new URL(url);
    const { w, h, q } = SIZE_PRESETS[size];
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(w));
    parsed.searchParams.set('h', String(h));
    parsed.searchParams.set('q', String(q));
    parsed.searchParams.set('fm', 'webp');
    parsed.searchParams.delete('ixlib');
    parsed.searchParams.delete('ixid');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function unsplashSrcSet(url: string): string | undefined {
  if (!url.includes('images.unsplash.com')) return undefined;
  return [
    `${optimizeUnsplashUrl(url, 'thumb')} 96w`,
    `${optimizeUnsplashUrl(url, 'card')} 480w`,
    `${optimizeUnsplashUrl(url, 'large')} 720w`,
  ].join(', ');
}

export function unsplashBlurUrl(url: string): string | undefined {
  if (!url.includes('images.unsplash.com/photo-')) return undefined;
  const match = url.match(/photo-([a-zA-Z0-9_-]+)/);
  if (!match) return undefined;
  return buildUnsplashBlur(match[1]);
}

function u(id: string) {
  return buildUnsplashUrl(id, 'card');
}

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
  imagePosition?: string;
  /** When false, slide is hidden on the storefront. Default true. */
  active?: boolean;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: HERO_IMAGE,
    tagline: 'Ogijo · Fresh daily',
    title: 'Fresh Nigerian Meals,',
    highlight: 'Delivered Hot.',
    description:
      'Order authentic Nigerian dishes prepared fresh daily from our Ogijo kitchen.',
    primaryCta: { label: 'Order Now', to: '/menu' },
    secondaryCta: { label: 'Browse Menu', to: '/menu' },
    imagePosition: '70% center',
  },
  {
    image: HERO_INTERIOR_1,
    tagline: 'Made to order',
    title: 'Build Your Perfect',
    highlight: 'Meal Pack',
    description:
      'Choose swallow, soups, proteins, and sides — customized to your taste and delivered hot.',
    primaryCta: { label: 'Order Now', to: '/build' },
    secondaryCta: { label: 'Browse Menu', to: '/menu' },
    imagePosition: 'center',
  },
  {
    image: HERO_INTERIOR_2,
    tagline: 'Ogijo · Ikorodu · Lagos',
    title: 'Hot Meals,',
    highlight: 'To Your Door',
    description:
      'Same kitchen, same taste — order online for delivery or pickup. No account needed.',
    primaryCta: { label: 'Order Now', to: '/menu' },
    secondaryCta: { label: 'Browse Menu', to: '/menu' },
    imagePosition: 'center',
  },
];

/** Verified Unsplash photos (HTTP 200) — Nigerian / matching food imagery */
export const DEFAULT_FOOD_IMAGE = u('1664992960082-0ea299a9c53e');

const CATEGORY_IMAGES: Record<string, string> = {
  swallow: u('1604329760661-e71dc83f8f26'),
  meals: u('1664992960082-0ea299a9c53e'),
  protein: u('1555939594-58d7cb561ad1'),
  sides: u('1603048297172-c92544798d5a'),
  soups: u('1763048443535-1243379234e2'),
  // legacy slugs (older admin data)
  rice: u('1664992960082-0ea299a9c53e'),
  soup: u('1763048443535-1243379234e2'),
  proteins: u('1555939594-58d7cb561ad1'),
  drinks: u('1602856124289-0331a6eff6fe'),
  snacks: u('1530469912745-a215c6b256ea'),
  desserts: u('1563805042-7684c019e1cb'),
  extras: u('1603048297172-c92544798d5a'),
  breakfast: u('1525351484163-7529414344d8'),
};

/**
 * One curated working Unsplash image per menu slug.
 * Prefer real Nigerian dish photos where available (jollof, egusi, okra, moi moi, etc.).
 */
const FOOD_IMAGES: Record<string, string> = {
  // Swallow
  amala: u('1604329760661-e71dc83f8f26'),
  eba: u('1614725363900-538db555d7b4'),
  semo: u('1604329760661-e71dc83f8f26'),
  'pounded-yam': u('1614725363900-538db555d7b4'),
  // Meals
  'jollof-rice': u('1664992960082-0ea299a9c53e'),
  'fried-rice': u('1603496987674-79600a000f55'),
  'ofada-rice': u('1664993101841-036f189719b6'),
  beans: u('1664334997177-6ae654a62735'),
  spaghetti: u('1551183053-bf91a1d81141'),
  'porridge-yam': u('1596797038530-2c107229654b'),
  yam: u('1596797038530-2c107229654b'),
  'special-rice': u('1666190092689-e3968aa0c32c'),
  // Protein
  'goat-meat': u('1604908176997-125f25cc6f3d'),
  beef: u('1555939594-58d7cb561ad1'),
  ponmo: u('1476224203421-9ac39bcb3327'),
  egg: u('1482049016688-2d3e1b311543'),
  turkey: u('1626645738196-c2a7c87a8f58'),
  chicken: u('1532550907401-a500c9a57435'),
  'wings-laps': u('1586793783658-261cddf883ef'),
  'hake-fish': u('1665401015549-712c0dc5ef85'),
  'titus-fish': u('1665401015549-712c0dc5ef85'),
  'fresh-fish': u('1665332195309-9d75071138f0'),
  'cat-fish': u('1665401015549-712c0dc5ef85'),
  gizzard: u('1476224203421-9ac39bcb3327'),
  'panla-kika': u('1665332195309-9d75071138f0'),
  brokoto: u('1476224203421-9ac39bcb3327'),
  snail: u('1604908176997-125f25cc6f3d'),
  // Sides
  plantain: u('1603048297172-c92544798d5a'),
  'moi-moi': u('1661588669110-81142a5b9e57'),
  salad: u('1512621776951-a57141f2eefd'),
  // Soups
  ewedu: u('1604329760661-e71dc83f8f26'),
  gbegiri: u('1708782344137-21c48d98dfcc'),
  egusi: u('1763048443535-1243379234e2'),
  okro: u('1665332561290-cc6757172890'),
  'efo-riro': u('1604329760661-e71dc83f8f26'),
};

export function getFoodImageUrl(
  slug: string,
  category: string,
  size: UnsplashSize = 'card'
): string {
  const base = FOOD_IMAGES[slug] ?? CATEGORY_IMAGES[category] ?? DEFAULT_FOOD_IMAGE;
  return optimizeUnsplashUrl(base, size);
}

export function resolveFoodImage(
  food: {
    image?: string | null;
    slug: string;
    category?: { slug: string };
  },
  size: UnsplashSize = 'card'
): string {
  const image = food.image?.trim();
  if (
    image &&
    (image.startsWith('http') ||
      image.startsWith('data:') ||
      image.startsWith('blob:') ||
      image.startsWith('/'))
  ) {
    return optimizeUnsplashUrl(image, size);
  }
  return getFoodImageUrl(food.slug, food.category?.slug ?? 'extras', size);
}

/** All curated menu image URLs (for preload / admin import). */
export function getAllMenuImageEntries(): Array<{ slug: string; url: string }> {
  return Object.entries(FOOD_IMAGES).map(([slug, url]) => ({
    slug,
    url: optimizeUnsplashUrl(url, 'card'),
  }));
}
