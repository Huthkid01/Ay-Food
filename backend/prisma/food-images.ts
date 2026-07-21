/** Food image URLs — hero uses local A.Y Food Palace photo; menu items use Unsplash */

const params = 'auto=format&fit=crop&w=800&h=600&q=80';

export const HERO_IMAGE = '/assets/hero.png';

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
};

export function getFoodImageUrl(slug: string, category: string): string {
  return FOOD_IMAGES[slug] ?? CATEGORY_IMAGES[category] ?? DEFAULT_FOOD_IMAGE;
}

export function getCategoryImageUrl(category: string): string {
  return CATEGORY_IMAGES[category] ?? DEFAULT_FOOD_IMAGE;
}
