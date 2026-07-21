import { useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/Toast';
import { resolveFoodImage } from '../utils/food-images';
import type { Food, CartItem } from '../types';

function toFoodInput(food: Food): Omit<CartItem, 'id' | 'packName'> | null {
  const portion = food.portions[0];
  if (!portion) return null;
  return {
    foodId: food.id,
    foodName: food.name,
    foodPortionId: portion.id,
    portionName: portion.portion.name,
    unitPrice: portion.price,
    quantity: 1,
    image: resolveFoodImage(food),
  };
}

/** Sync food card +/- controls with a pack, and notify the customer on every change */
export function useFoodPackQuantity(targetPackIndex: number, packLabel?: string) {
  const { packs, getFoodQuantityInPack, adjustFoodQuantity } = useCart();
  const { showToast } = useToast();

  const resolvedPackName =
    packLabel ??
    packs[targetPackIndex]?.name ??
    (packs.length === 0 ? 'Pack 1' : `Pack ${targetPackIndex + 1}`);

  const getQuantity = useCallback(
    (food: Food) => {
      const portion = food.portions[0];
      if (!portion) return 0;
      return getFoodQuantityInPack(food.id, portion.id, targetPackIndex);
    },
    [getFoodQuantityInPack, targetPackIndex]
  );

  const changeQuantity = useCallback(
    (food: Food, delta: number) => {
      const input = toFoodInput(food);
      if (!input || delta === 0) return false;

      const before = getQuantity(food);
      if (delta < 0 && before <= 0) return false;

      const creatingPack = packs.length === 0 && delta > 0 && before === 0;
      adjustFoodQuantity(input, delta, { packIndex: targetPackIndex });
      const after = Math.max(0, before + delta);
      const pack = resolvedPackName;

      if (delta > 0) {
        if (creatingPack) {
          showToast(`${pack} created — ${food.name} added (qty: ${after})`);
        } else if (before === 0) {
          showToast(`${food.name} added to ${pack} (qty: ${after})`);
        } else {
          showToast(`${food.name}: quantity increased to ${after} in ${pack}`);
        }
      } else if (after === 0) {
        showToast(`${food.name} removed from ${pack}`);
      } else {
        showToast(`${food.name}: quantity decreased to ${after} in ${pack}`);
      }

      return true;
    },
    [
      adjustFoodQuantity,
      getQuantity,
      packs.length,
      resolvedPackName,
      showToast,
      targetPackIndex,
    ]
  );

  return { getQuantity, changeQuantity };
}
