import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import type { CartItem, CartPack } from '../types';
import { PACK_FEE, packItemsTotal } from '../types';
import { generateId } from '../utils/helpers';

interface CartState {
  packs: CartPack[];
  currentPackIndex: number;
}

type FoodInput = Omit<CartItem, 'id' | 'packName'>;

type CartAction =
  | { type: 'ADD_FOOD'; payload: FoodInput & { packIndex?: number } }
  | { type: 'ADJUST_FOOD_QTY'; payload: FoodInput & { packIndex?: number; delta: number } }
  | { type: 'ADD_PACK' }
  | { type: 'DUPLICATE_PACK'; payload: number }
  | { type: 'DELETE_PACK'; payload: number }
  | { type: 'SELECT_PACK'; payload: number }
  | { type: 'REMOVE_PACK_ITEM'; payload: { packId: string; itemId: string } }
  | { type: 'UPDATE_PACK_ITEM_QTY'; payload: { packId: string; itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD'; payload: CartState };

const CART_KEY = 'ay-food-cart-v2';

function calcPackIndex(packs: CartPack[], packIndex?: number): number {
  if (packs.length === 0) return 0;
  if (packIndex === undefined) return 0;
  return Math.min(Math.max(0, packIndex), packs.length - 1);
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_FOOD': {
      const { packIndex: requestedIndex, ...food } = action.payload;

      if (state.packs.length === 0) {
        const item: CartItem = { ...food, id: generateId() };
        return {
          packs: [{ id: generateId(), name: 'Pack 1', items: [item] }],
          currentPackIndex: 0,
        };
      }

      const packIndex =
        requestedIndex !== undefined
          ? calcPackIndex(state.packs, requestedIndex)
          : 0;
      const target = state.packs[packIndex]!;
      const existing = target.items.find(
        (i) =>
          i.foodId === food.foodId &&
          i.foodPortionId === food.foodPortionId &&
          i.notes === food.notes
      );

      const packs = state.packs.map((pack, i) => {
        if (i !== packIndex) return pack;
        if (existing) {
          return {
            ...pack,
            items: pack.items.map((item) =>
              item.id === existing.id
                ? { ...item, quantity: item.quantity + food.quantity }
                : item
            ),
          };
        }
        return {
          ...pack,
          items: [...pack.items, { ...food, id: generateId() }],
        };
      });

      return { packs, currentPackIndex: packIndex };
    }

    case 'ADJUST_FOOD_QTY': {
      const { packIndex: requestedIndex, delta, ...food } = action.payload;
      if (delta === 0) return state;

      if (state.packs.length === 0) {
        if (delta > 0) {
          const item: CartItem = { ...food, id: generateId(), quantity: delta };
          return {
            packs: [{ id: generateId(), name: 'Pack 1', items: [item] }],
            currentPackIndex: 0,
          };
        }
        return state;
      }

      const packIndex =
        requestedIndex !== undefined
          ? calcPackIndex(state.packs, requestedIndex)
          : 0;
      const target = state.packs[packIndex]!;
      const existing = target.items.find(
        (i) =>
          i.foodId === food.foodId &&
          i.foodPortionId === food.foodPortionId &&
          i.notes === food.notes
      );

      if (!existing) {
        if (delta <= 0) return state;
        const packs = state.packs.map((pack, i) =>
          i === packIndex
            ? { ...pack, items: [...pack.items, { ...food, id: generateId(), quantity: delta }] }
            : pack
        );
        return { packs, currentPackIndex: packIndex };
      }

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return cartReducer(state, {
          type: 'REMOVE_PACK_ITEM',
          payload: { packId: target.id, itemId: existing.id },
        });
      }

      const packs = state.packs.map((pack, i) =>
        i === packIndex
          ? {
              ...pack,
              items: pack.items.map((item) =>
                item.id === existing.id ? { ...item, quantity: newQty } : item
              ),
            }
          : pack
      );
      return { packs, currentPackIndex: packIndex };
    }

    case 'ADD_PACK': {
      const nextNum = state.packs.length + 1;
      return {
        packs: [...state.packs, { id: generateId(), name: `Pack ${nextNum}`, items: [] }],
        currentPackIndex: state.packs.length,
      };
    }

    case 'DUPLICATE_PACK': {
      const source = state.packs[action.payload];
      if (!source) return state;
      const nextNum = state.packs.length + 1;
      const duplicated: CartPack = {
        id: generateId(),
        name: `Pack ${nextNum}`,
        items: source.items.map((item) => ({ ...item, id: generateId() })),
      };
      return {
        packs: [...state.packs, duplicated],
        currentPackIndex: state.packs.length,
      };
    }

    case 'DELETE_PACK': {
      if (state.packs.length <= 1) return state;
      const packs = state.packs.filter((_, i) => i !== action.payload);
      const currentPackIndex = Math.min(state.currentPackIndex, packs.length - 1);
      return { packs, currentPackIndex: Math.max(0, currentPackIndex) };
    }

    case 'SELECT_PACK':
      return {
        ...state,
        currentPackIndex: calcPackIndex(state.packs, action.payload),
      };

    case 'REMOVE_PACK_ITEM': {
      const { packId, itemId } = action.payload;
      let packs = state.packs
        .map((pack) =>
          pack.id === packId
            ? { ...pack, items: pack.items.filter((item) => item.id !== itemId) }
            : pack
        )
        .filter((pack) => pack.items.length > 0 || state.packs.length === 1);

      if (packs.length === 0) {
        return { packs: [], currentPackIndex: 0 };
      }

      const currentPackIndex = Math.min(state.currentPackIndex, packs.length - 1);
      return { packs, currentPackIndex: Math.max(0, currentPackIndex) };
    }

    case 'UPDATE_PACK_ITEM_QTY': {
      const { packId, itemId, quantity } = action.payload;
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_PACK_ITEM', payload: { packId, itemId } });
      }
      const packs = state.packs.map((pack) =>
        pack.id === packId
          ? {
              ...pack,
              items: pack.items.map((item) =>
                item.id === itemId ? { ...item, quantity } : item
              ),
            }
          : pack
      );
      return { ...state, packs };
    }

    case 'CLEAR_CART':
      return { packs: [], currentPackIndex: 0 };

    case 'LOAD':
      return action.payload;

    default:
      return state;
  }
}

function migrateLegacyCart(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object') return { packs: [], currentPackIndex: 0 };
  const data = raw as Record<string, unknown>;

  if (Array.isArray(data.packs)) {
    return {
      packs: data.packs as CartPack[],
      currentPackIndex: (data.currentPackIndex as number) ?? 0,
    };
  }

  // Legacy flat items array → Pack 1
  if (Array.isArray(data.items) && data.items.length > 0) {
    return {
      packs: [{ id: generateId(), name: 'Pack 1', items: data.items as CartItem[] }],
      currentPackIndex: 0,
    };
  }

  return { packs: [], currentPackIndex: 0 };
}

interface CartContextValue {
  packs: CartPack[];
  currentPackIndex: number;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  packFees: number;
  activePacks: CartPack[];
  addFood: (food: FoodInput, options?: { packIndex?: number }) => void;
  adjustFoodQuantity: (food: FoodInput, delta: number, options?: { packIndex?: number }) => void;
  getFoodQuantityInPack: (foodId: string, foodPortionId: string | undefined, packIndex?: number) => number;
  addPack: () => void;
  duplicatePack: (packIndex: number) => void;
  deletePack: (packIndex: number) => void;
  selectPack: (packIndex: number) => void;
  removePackItem: (packId: string, itemId: string) => void;
  updatePackItemQuantity: (packId: string, itemId: string, quantity: number) => void;
  getFlattenedItems: () => CartItem[];
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { packs: [], currentPackIndex: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      try {
        dispatch({ type: 'LOAD', payload: migrateLegacyCart(JSON.parse(saved)) });
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  const activePacks = useMemo(
    () => state.packs.filter((p) => p.items.length > 0),
    [state.packs]
  );

  const items = useMemo(
    () =>
      state.packs.flatMap((pack) =>
        pack.items.map((item) => ({ ...item, packName: pack.name }))
      ),
    [state.packs]
  );

  const itemCount = useMemo(
    () => state.packs.reduce((sum, pack) => sum + pack.items.reduce((s, i) => s + i.quantity, 0), 0),
    [state.packs]
  );

  const subtotal = useMemo(
    () => state.packs.reduce((sum, pack) => sum + packItemsTotal(pack), 0),
    [state.packs]
  );

  const packFees = useMemo(
    () => activePacks.length * PACK_FEE,
    [activePacks]
  );

  const value: CartContextValue = {
    packs: state.packs,
    currentPackIndex: state.currentPackIndex,
    items,
    itemCount,
    subtotal,
    packFees,
    activePacks,
    addFood: (food, options) =>
      dispatch({ type: 'ADD_FOOD', payload: { ...food, packIndex: options?.packIndex } }),
    adjustFoodQuantity: (food, delta, options) =>
      dispatch({ type: 'ADJUST_FOOD_QTY', payload: { ...food, delta, packIndex: options?.packIndex } }),
    getFoodQuantityInPack: (foodId, foodPortionId, packIndex = 0) => {
      const pack = state.packs[packIndex];
      if (!pack) return 0;
      const item = pack.items.find(
        (i) => i.foodId === foodId && i.foodPortionId === foodPortionId
      );
      return item?.quantity ?? 0;
    },
    addPack: () => dispatch({ type: 'ADD_PACK' }),
    duplicatePack: (i) => dispatch({ type: 'DUPLICATE_PACK', payload: i }),
    deletePack: (i) => dispatch({ type: 'DELETE_PACK', payload: i }),
    selectPack: (i) => dispatch({ type: 'SELECT_PACK', payload: i }),
    removePackItem: (packId, itemId) =>
      dispatch({ type: 'REMOVE_PACK_ITEM', payload: { packId, itemId } }),
    updatePackItemQuantity: (packId, itemId, quantity) =>
      dispatch({ type: 'UPDATE_PACK_ITEM_QTY', payload: { packId, itemId, quantity } }),
    getFlattenedItems: () => items,
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
