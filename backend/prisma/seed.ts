import { PrismaClient, UserRole, CouponType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { HERO_IMAGE, getFoodImageUrl } from './food-images.js';

const prisma = new PrismaClient();

const PORTIONS = [
  { name: 'Small', slug: 'small', sortOrder: 1 },
  { name: 'Medium', slug: 'medium', sortOrder: 2 },
  { name: 'Large', slug: 'large', sortOrder: 3 },
  { name: 'Extra Large', slug: 'extra-large', sortOrder: 4 },
];

const CATEGORIES = [
  { name: 'Rice', slug: 'rice', sortOrder: 1 },
  { name: 'Swallow', slug: 'swallow', sortOrder: 2 },
  { name: 'Soup', slug: 'soup', sortOrder: 3 },
  { name: 'Proteins', slug: 'proteins', sortOrder: 4 },
  { name: 'Drinks', slug: 'drinks', sortOrder: 5 },
  { name: 'Snacks', slug: 'snacks', sortOrder: 6 },
  { name: 'Desserts', slug: 'desserts', sortOrder: 7 },
  { name: 'Extras', slug: 'extras', sortOrder: 8 },
  { name: 'Breakfast', slug: 'breakfast', sortOrder: 9 },
];

type FoodSeed = {
  name: string;
  slug: string;
  category: string;
  description: string;
  basePrice: number;
  calories: number;
  tags?: string;
  isPopular?: boolean;
  isNew?: boolean;
  prepTimeMinutes?: number;
};

const FOODS: FoodSeed[] = [
  { name: 'Jollof Rice', slug: 'jollof-rice', category: 'rice', description: 'Smoky party-style jollof with rich tomato base', basePrice: 1200, calories: 450, tags: 'popular,spicy', isPopular: true },
  { name: 'Fried Rice', slug: 'fried-rice', category: 'rice', description: 'Colorful Nigerian fried rice with mixed vegetables', basePrice: 1100, calories: 420, isPopular: true },
  { name: 'Ofada Rice', slug: 'ofada-rice', category: 'rice', description: 'Local ofada rice with ayamase sauce', basePrice: 1500, calories: 480, tags: 'local' },
  { name: 'White Rice', slug: 'white-rice', category: 'rice', description: 'Steamed long grain white rice', basePrice: 800, calories: 350 },
  { name: 'Coconut Rice', slug: 'coconut-rice', category: 'rice', description: 'Fragrant coconut-infused rice', basePrice: 1300, calories: 460 },
  { name: 'Native Jollof Rice', slug: 'native-jollof', category: 'rice', description: 'Traditional pot jollof with local spices', basePrice: 1400, calories: 470, isPopular: true },
  { name: 'Amala', slug: 'amala', category: 'swallow', description: 'Smooth yam flour swallow', basePrice: 900, calories: 280, isPopular: true },
  { name: 'Eba', slug: 'eba', category: 'swallow', description: 'Classic garri swallow', basePrice: 700, calories: 250 },
  { name: 'Pounded Yam', slug: 'pounded-yam', category: 'swallow', description: 'Soft hand-pounded yam', basePrice: 1200, calories: 320, isPopular: true },
  { name: 'Semovita', slug: 'semovita', category: 'swallow', description: 'Light semolina swallow', basePrice: 800, calories: 290 },
  { name: 'Fufu', slug: 'fufu', category: 'swallow', description: 'Traditional cassava fufu', basePrice: 750, calories: 270 },
  { name: 'Wheat Swallow', slug: 'wheat-swallow', category: 'swallow', description: 'Soft wheat meal swallow', basePrice: 850, calories: 285 },
  { name: 'Starch', slug: 'starch', category: 'swallow', description: 'Delta-style starch swallow', basePrice: 900, calories: 295 },
  { name: 'Egusi Soup', slug: 'egusi-soup', category: 'soup', description: 'Rich melon seed soup with leafy greens', basePrice: 1800, calories: 520, isPopular: true },
  { name: 'Efo Riro', slug: 'efo-riro', category: 'soup', description: 'Spinach stew with assorted meat', basePrice: 1700, calories: 480, isPopular: true },
  { name: 'Okra Soup', slug: 'okra-soup', category: 'soup', description: 'Draw soup with fresh okra', basePrice: 1600, calories: 440 },
  { name: 'Pepper Soup', slug: 'pepper-soup', category: 'soup', description: 'Spicy aromatic broth', basePrice: 2000, calories: 380, tags: 'spicy' },
  { name: 'Ogbono Soup', slug: 'ogbono-soup', category: 'soup', description: 'Wild mango seed draw soup', basePrice: 1650, calories: 460 },
  { name: 'Bitterleaf Soup', slug: 'bitterleaf-soup', category: 'soup', description: 'Traditional onugbu soup', basePrice: 1750, calories: 470 },
  { name: 'Banga Soup', slug: 'banga-soup', category: 'soup', description: 'Palm nut soup with fresh fish', basePrice: 1900, calories: 490 },
  { name: 'Oha Soup', slug: 'oha-soup', category: 'soup', description: 'Igbo-style oha leaf soup', basePrice: 1850, calories: 480 },
  { name: 'Edikaikong', slug: 'edikaikong', category: 'soup', description: 'Mixed vegetable soup with assorted meat', basePrice: 1800, calories: 500 },
  { name: 'Grilled Chicken', slug: 'grilled-chicken', category: 'proteins', description: 'Marinated flame-grilled chicken', basePrice: 2500, calories: 380, isPopular: true },
  { name: 'Fried Chicken (1 Piece)', slug: 'fried-chicken-1', category: 'proteins', description: 'Crispy fried chicken piece', basePrice: 1200, calories: 320 },
  { name: 'Fried Chicken (2 Pieces)', slug: 'fried-chicken-2', category: 'proteins', description: 'Two pieces crispy fried chicken', basePrice: 2200, calories: 640 },
  { name: 'Fried Chicken (3 Pieces)', slug: 'fried-chicken-3', category: 'proteins', description: 'Three pieces crispy fried chicken', basePrice: 3000, calories: 960 },
  { name: 'Beef Suya', slug: 'beef-suya', category: 'proteins', description: 'Spicy grilled beef skewers', basePrice: 2000, calories: 420, tags: 'spicy,grilled' },
  { name: 'Goat Meat', slug: 'goat-meat', category: 'proteins', description: 'Tender peppered goat meat', basePrice: 2800, calories: 450 },
  { name: 'Turkey Wings', slug: 'turkey-wings', category: 'proteins', description: 'Seasoned roasted turkey wings', basePrice: 2200, calories: 400 },
  { name: 'Grilled Fish', slug: 'grilled-fish', category: 'proteins', description: 'Whole grilled catfish', basePrice: 3500, calories: 380 },
  { name: 'Snail Pepper Soup', slug: 'snail-pepper-soup', category: 'proteins', description: 'Delicacy snail in spicy broth', basePrice: 4000, calories: 290 },
  { name: 'Moi Moi', slug: 'moi-moi', category: 'proteins', description: 'Steamed bean pudding', basePrice: 800, calories: 220 },
  { name: 'Beans Porridge', slug: 'beans-porridge', category: 'proteins', description: 'Slow-cooked Nigerian beans', basePrice: 1000, calories: 340 },
  { name: 'Nkwobi', slug: 'nkwobi', category: 'proteins', description: 'Spicy cow foot delicacy', basePrice: 3200, calories: 410, isNew: true },
  { name: 'Plantain (Fried)', slug: 'fried-plantain', category: 'extras', description: 'Sweet fried plantain slices', basePrice: 600, calories: 180, isPopular: true },
  { name: 'Coleslaw', slug: 'coleslaw', category: 'extras', description: 'Fresh creamy coleslaw', basePrice: 500, calories: 120 },
  { name: 'Garden Salad', slug: 'garden-salad', category: 'extras', description: 'Mixed greens with dressing', basePrice: 700, calories: 90 },
  { name: 'Shawarma', slug: 'shawarma', category: 'snacks', description: 'Chicken shawarma wrap', basePrice: 2500, calories: 520, isPopular: true },
  { name: 'Meat Pie', slug: 'meat-pie', category: 'snacks', description: 'Flaky pastry with minced beef', basePrice: 800, calories: 340 },
  { name: 'Puff Puff (6pcs)', slug: 'puff-puff', category: 'snacks', description: 'Golden fried dough balls', basePrice: 500, calories: 280 },
  { name: 'Sausage Roll', slug: 'sausage-roll', category: 'snacks', description: 'Baked sausage in pastry', basePrice: 700, calories: 310 },
  { name: 'Boli & Groundnut', slug: 'boli-groundnut', category: 'snacks', description: 'Roasted plantain with groundnut', basePrice: 600, calories: 250, isPopular: true },
  { name: 'Burger', slug: 'burger', category: 'snacks', description: 'Beef burger with fries', basePrice: 3500, calories: 680 },
  { name: 'Pizza (Margherita)', slug: 'pizza-margherita', category: 'snacks', description: 'Classic cheese pizza', basePrice: 4500, calories: 720 },
  { name: 'Pasta Alfredo', slug: 'pasta-alfredo', category: 'snacks', description: 'Creamy chicken alfredo pasta', basePrice: 3200, calories: 580 },
  { name: 'Chapman', slug: 'chapman', category: 'drinks', description: 'Nigerian fruit punch cocktail', basePrice: 1500, calories: 180, isPopular: true },
  { name: 'Zobo', slug: 'zobo', category: 'drinks', description: 'Hibiscus drink with spices', basePrice: 800, calories: 90 },
  { name: 'Fresh Orange Juice', slug: 'orange-juice', category: 'drinks', description: 'Freshly squeezed orange juice', basePrice: 1200, calories: 110 },
  { name: 'Malt Drink', slug: 'malt-drink', category: 'drinks', description: 'Chilled malt beverage', basePrice: 600, calories: 150 },
  { name: 'Bottled Water', slug: 'bottled-water', category: 'drinks', description: '500ml still water', basePrice: 300, calories: 0 },
  { name: 'Soft Drink', slug: 'soft-drink', category: 'drinks', description: 'Assorted soft drinks', basePrice: 500, calories: 140 },
  { name: 'Smoothie Bowl', slug: 'smoothie-bowl', category: 'drinks', description: 'Mixed fruit smoothie', basePrice: 2000, calories: 220, isNew: true },
  { name: 'Chin Chin', slug: 'chin-chin', category: 'desserts', description: 'Crunchy fried snack bites', basePrice: 600, calories: 320 },
  { name: 'Puff Puff with Sugar', slug: 'puff-puff-sugar', category: 'desserts', description: 'Sweet dusted puff puff', basePrice: 700, calories: 350 },
  { name: 'Fruit Salad', slug: 'fruit-salad', category: 'desserts', description: 'Seasonal fresh fruit mix', basePrice: 1500, calories: 140 },
  { name: 'Ice Cream Scoop', slug: 'ice-cream', category: 'desserts', description: 'Vanilla or chocolate scoop', basePrice: 1000, calories: 200 },
  { name: 'Akara (4pcs)', slug: 'akara', category: 'breakfast', description: 'Bean fritters with pap option', basePrice: 800, calories: 280 },
  { name: 'Yam & Egg Sauce', slug: 'yam-egg-sauce', category: 'breakfast', description: 'Boiled yam with tomato egg sauce', basePrice: 1500, calories: 420 },
  { name: 'Bread & Egg', slug: 'bread-egg', category: 'breakfast', description: 'Toasted bread with fried eggs', basePrice: 1200, calories: 380 },
  { name: 'Pap & Akara', slug: 'pap-akara', category: 'breakfast', description: 'Traditional pap with akara', basePrice: 1000, calories: 340, isPopular: true },
  { name: 'Extra Pepper Sauce', slug: 'extra-pepper-sauce', category: 'extras', description: 'House special pepper sauce', basePrice: 300, calories: 40 },
  { name: 'Extra Onions', slug: 'extra-onions', category: 'extras', description: 'Fresh sliced onions', basePrice: 200, calories: 15 },
];

function portionPrices(base: number): number[] {
  return [
    Math.round(base * 0.7),
    base,
    Math.round(base * 1.4),
    Math.round(base * 1.9),
  ];
}

async function main() {
  console.log('🌱 Seeding Ay Food database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.foodPortion.deleteMany();
  await prisma.food.deleteMany();
  await prisma.category.deleteMany();
  await prisma.portionTemplate.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.address.deleteMany();
  await prisma.restaurantSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Ay Food',
      slug: 'ay-food',
      description: 'Build your perfect meal pack with authentic Nigerian cuisine. Located in Ogijo, Ikorodu — order online with delivery or pickup.',
      logo: HERO_IMAGE,
      coverImage: HERO_IMAGE,
      phone: '+2349024475402',
      email: 'contact@ayfoodpalace.com',
      address: 'Ogijo, Ikorodu, Lagos',
      city: 'Ikorodu',
      taxRate: 7.5,
    },
  });

  await prisma.restaurantSetting.create({
    data: { restaurantId: restaurant.id },
  });

  const portionMap = new Map<string, string>();
  for (const p of PORTIONS) {
    const created = await prisma.portionTemplate.create({
      data: { ...p, restaurantId: restaurant.id },
    });
    portionMap.set(p.slug, created.id);
  }

  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({
      data: { ...c, restaurantId: restaurant.id },
    });
    categoryMap.set(c.slug, created.id);
  }

  for (const food of FOODS) {
    const categoryId = categoryMap.get(food.category);
    if (!categoryId) continue;

    const createdFood = await prisma.food.create({
      data: {
        name: food.name,
        slug: food.slug,
        description: food.description,
        categoryId,
        restaurantId: restaurant.id,
        calories: food.calories,
        tags: food.tags ?? '',
        isPopular: food.isPopular ?? false,
        isNew: food.isNew ?? false,
        prepTimeMinutes: food.prepTimeMinutes ?? 15,
        image: getFoodImageUrl(food.slug, food.category),
      },
    });

    const prices = portionPrices(food.basePrice);
    const portionSlugs = ['small', 'medium', 'large', 'extra-large'];
    for (let i = 0; i < portionSlugs.length; i++) {
      const portionId = portionMap.get(portionSlugs[i]!);
      if (!portionId) continue;
      await prisma.foodPortion.create({
        data: {
          foodId: createdFood.id,
          portionId,
          price: prices[i]!,
          calories: Math.round(food.calories * (0.7 + i * 0.3)),
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash('password123', 12);

  await prisma.user.create({
    data: {
      email: 'contact@ayfoodpalace.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Ay Food',
      phone: '+2349024475402',
      role: UserRole.OWNER,
      restaurantId: restaurant.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'customer@example.com',
      passwordHash,
      firstName: 'Ada',
      lastName: 'Okonkwo',
      phone: '+2348012345678',
      role: UserRole.CUSTOMER,
    },
  });

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: CouponType.PERCENTAGE, value: 10, minOrder: 3000, maxUses: 100, restaurantId: restaurant.id },
      { code: 'FLAT500', type: CouponType.FIXED, value: 500, minOrder: 5000, maxUses: 50, restaurantId: restaurant.id },
    ],
  });

  await prisma.deliveryZone.createMany({
    data: [
      { name: 'Ogijo', fee: 800, estimatedMinutes: 25, restaurantId: restaurant.id },
      { name: 'Ikorodu Central', fee: 1200, estimatedMinutes: 35, restaurantId: restaurant.id },
      { name: 'Ikorodu GRA', fee: 1500, estimatedMinutes: 40, restaurantId: restaurant.id },
      { name: 'Sagamu Road Axis', fee: 1800, estimatedMinutes: 50, restaurantId: restaurant.id },
    ],
  });

  await prisma.driver.create({
    data: { name: 'Emeka Okafor', phone: '+2348098765432', vehicle: 'Motorcycle', restaurantId: restaurant.id },
  });

  await prisma.inventoryItem.createMany({
    data: [
      { name: 'Rice', quantity: 500, unit: 'kg', minStock: 50, restaurantId: restaurant.id },
      { name: 'Chicken', quantity: 200, unit: 'kg', minStock: 30, restaurantId: restaurant.id },
      { name: 'Tomatoes', quantity: 80, unit: 'kg', minStock: 15, restaurantId: restaurant.id },
      { name: 'Palm Oil', quantity: 40, unit: 'liters', minStock: 10, restaurantId: restaurant.id },
    ],
  });

  await prisma.restaurantTable.createMany({
    data: [
      { number: 'T1', capacity: 2, qrCode: 'QR-T1-AYFOOD', restaurantId: restaurant.id },
      { number: 'T2', capacity: 4, qrCode: 'QR-T2-AYFOOD', restaurantId: restaurant.id },
      { number: 'T3', capacity: 6, qrCode: 'QR-T3-AYFOOD', restaurantId: restaurant.id },
    ],
  });

  console.log(`✅ Seeded ${FOODS.length} foods, ${CATEGORIES.length} categories, restaurant: ${restaurant.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
