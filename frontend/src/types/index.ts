export interface FoodPortion {
  id: string;
  price: number;
  calories?: number;
  portion: { id: string; name: string; slug: string };
}

export interface Food {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  calories?: number;
  tags: string;
  isPopular: boolean;
  isNew: boolean;
  prepTimeMinutes: number;
  category: { name: string; slug: string };
  portions: FoodPortion[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  _count?: { foods: number };
}

export interface CartItem {
  id: string;
  foodId: string;
  foodName: string;
  foodPortionId?: string;
  portionName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  packName?: string;
  image?: string;
}

export interface CartPack {
  id: string;
  name: string;
  items: CartItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress?: string;
  items: Array<{
    id: string;
    portionName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    food: { name: string; image?: string };
  }>;
  statusHistory?: Array<{ status: string; note?: string; createdAt: string }>;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxRate: number;
  settings?: {
    defaultDeliveryFee: number;
    minOrderAmount: number;
  };
}

export const PACK_FEE = 300;

export function packItemsTotal(pack: CartPack): number {
  return pack.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
