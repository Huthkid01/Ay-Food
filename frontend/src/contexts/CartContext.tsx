import { createContext, useContext, useReducer, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
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

/** Always keep names as Pack 1, Pack 2, … in order */
function renumberPacks(packs: CartPack[]): CartPack[] {
  return packs.map((pack, i) => ({
    ...pack,
    name: `Pack ${i + 1}`,
  }));
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
      const packs = renumberPacks([
        ...state.packs,
        { id: generateId(), name: `Pack ${state.packs.length + 1}`, items: [] },
      ]);
      return {
        packs,
        currentPackIndex: packs.length - 1,
      };
    }

    case 'DUPLICATE_PACK': {
      const source = state.packs[action.payload];
      if (!source) return state;
      const packs = renumberPacks([
        ...state.packs,
        {
          id: generateId(),
          name: `Pack ${state.packs.length + 1}`,
          items: source.items.map((item) => ({ ...item, id: generateId() })),
        },
      ]);
      return {
        packs,
        currentPackIndex: packs.length - 1,
      };
    }

    case 'DELETE_PACK': {
      if (state.packs.length <= 1) return state;
      const deletedIndex = action.payload;
      const remaining = state.packs.filter((_, i) => i !== deletedIndex);
      const packs = renumberPacks(remaining);

      let currentPackIndex = state.currentPackIndex;
      if (deletedIndex < currentPackIndex) {
        currentPackIndex -= 1;
      } else if (deletedIndex === currentPackIndex) {
        currentPackIndex = Math.min(currentPackIndex, packs.length - 1);
      }
      currentPackIndex = Math.max(0, Math.min(currentPackIndex, packs.length - 1));

      return { packs, currentPackIndex };
    }

    case 'SELECT_PACK':
      return {
        ...state,
        currentPackIndex: calcPackIndex(state.packs, action.payload),
      };

    case 'REMOVE_PACK_ITEM': {
      const { packId, itemId } = action.payload;
      let packs = state.packs.map((pack) =>
        pack.id === packId
          ? { ...pack, items: pack.items.filter((item) => item.id !== itemId) }
          : pack
      );

      const emptiedIndex = packs.findIndex((p) => p.id === packId);
      const emptied = emptiedIndex >= 0 ? packs[emptiedIndex] : undefined;
      if (emptied && emptied.items.length === 0 && packs.length > 1) {
        packs = packs.filter((p) => p.id !== packId);
        packs = renumberPacks(packs);

        let currentPackIndex = state.currentPackIndex;
        if (emptiedIndex < currentPackIndex) currentPackIndex -= 1;
        else if (emptiedIndex === currentPackIndex) {
          currentPackIndex = Math.min(currentPackIndex, packs.length - 1);
        }
        return {
          packs,
          currentPackIndex: Math.max(0, Math.min(currentPackIndex, packs.length - 1)),
        };
      }

      if (packs.length === 0) {
        return { packs: [], currentPackIndex: 0 };
      }

      return {
        packs,
        currentPackIndex: Math.min(state.currentPackIndex, packs.length - 1),
      };
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

    case 'LOAD': {
      const packs = renumberPacks(action.payload.packs ?? []);
      return {
        packs,
        currentPackIndex: calcPackIndex(packs, action.payload.currentPackIndex),
      };
    }

    default:
      return state;
  }
}

function migrateLegacyCart(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object') return { packs: [], currentPackIndex: 0 };
  const data = raw as Record<string, unknown>;

  if (Array.isArray(data.packs)) {
    const packs = renumberPacks(data.packs as CartPack[]);
    return {
      packs,
      currentPackIndex: calcPackIndex(packs, (data.currentPackIndex as number) ?? 0),
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        dispatch({ type: 'LOAD', payload: migrateLegacyCart(JSON.parse(saved)) });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state, hydrated]);

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

  const addFood = useCallback(
    (food: FoodInput, options?: { packIndex?: number }) => {
      dispatch({ type: 'ADD_FOOD', payload: { ...food, packIndex: options?.packIndex } });
    },
    []
  );

  const adjustFoodQuantity = useCallback(
    (food: FoodInput, delta: number, options?: { packIndex?: number }) => {
      dispatch({
        type: 'ADJUST_FOOD_QTY',
        payload: { ...food, delta, packIndex: options?.packIndex },
      });
    },
    []
  );

  const getFoodQuantityInPack = useCallback(
    (foodId: string, foodPortionId: string | undefined, packIndex = 0) => {
      const pack = state.packs[packIndex];
      if (!pack) return 0;
      const item = pack.items.find(
        (i) => i.foodId === foodId && i.foodPortionId === foodPortionId
      );
      return item?.quantity ?? 0;
    },
    [state.packs]
  );

  const addPack = useCallback(() => dispatch({ type: 'ADD_PACK' }), []);
  const duplicatePack = useCallback(
    (i: number) => dispatch({ type: 'DUPLICATE_PACK', payload: i }),
    []
  );
  const deletePack = useCallback(
    (i: number) => dispatch({ type: 'DELETE_PACK', payload: i }),
    []
  );
  const selectPack = useCallback(
    (i: number) => dispatch({ type: 'SELECT_PACK', payload: i }),
    []
  );
  const removePackItem = useCallback(
    (packId: string, itemId: string) =>
      dispatch({ type: 'REMOVE_PACK_ITEM', payload: { packId, itemId } }),
    []
  );
  const updatePackItemQuantity = useCallback(
    (packId: string, itemId: string, quantity: number) =>
      dispatch({ type: 'UPDATE_PACK_ITEM_QTY', payload: { packId, itemId, quantity } }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);
  const getFlattenedItems = useCallback(() => items, [items]);

  const value: CartContextValue = useMemo(
    () => ({
      packs: state.packs,
      currentPackIndex: state.currentPackIndex,
      items,
      itemCount,
      subtotal,
      packFees,
      activePacks,
      addFood,
      adjustFoodQuantity,
      getFoodQuantityInPack,
      addPack,
      duplicatePack,
      deletePack,
      selectPack,
      removePackItem,
      updatePackItemQuantity,
      getFlattenedItems,
      clearCart,
    }),
    [
      state.packs,
      state.currentPackIndex,
      items,
      itemCount,
      subtotal,
      packFees,
      activePacks,
      addFood,
      adjustFoodQuantity,
      getFoodQuantityInPack,
      addPack,
      duplicatePack,
      deletePack,
      selectPack,
      removePackItem,
      updatePackItemQuantity,
      getFlattenedItems,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
