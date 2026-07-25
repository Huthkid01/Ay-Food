import { useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/Toast';
import { resolveFoodImage } from '../utils/food-images';
import type { Food, FoodPortion, CartItem } from '../types';

function toFoodInput(
  food: Food,
  portion?: FoodPortion | null
): Omit<CartItem, 'id' | 'packName'> | null {
  const selected = portion ?? food.portions[0];
  if (!selected) return null;
  return {
    foodId: food.id,
    foodName: food.name,
    foodPortionId: selected.id,
    portionName: selected.portion.name,
    unitPrice: selected.price,
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
    (food: Food, portionId?: string) => {
      const portion =
        (portionId ? food.portions.find((p) => p.id === portionId) : null) ?? food.portions[0];
      if (!portion) return 0;
      return getFoodQuantityInPack(food.id, portion.id, targetPackIndex);
    },
    [getFoodQuantityInPack, targetPackIndex]
  );

  const changeQuantity = useCallback(
    (food: Food, delta: number, portionId?: string) => {
      const portion =
        (portionId ? food.portions.find((p) => p.id === portionId) : null) ?? food.portions[0];
      const input = toFoodInput(food, portion);
      if (!input || delta === 0) return false;

      const before = getQuantity(food, portion?.id);
      if (delta < 0 && before <= 0) return false;

      const creatingPack = packs.length === 0 && delta > 0 && before === 0;
      adjustFoodQuantity(input, delta, { packIndex: targetPackIndex });
      const after = Math.max(0, before + delta);
      const pack = resolvedPackName;
      const sizeLabel =
        food.portions.length > 1 ? ` (${portion?.portion.name ?? ''})` : '';

      if (delta > 0) {
        if (creatingPack) {
          showToast(`${pack} created — ${food.name}${sizeLabel} added (qty: ${after})`);
        } else if (before === 0) {
          showToast(`${food.name}${sizeLabel} added to ${pack} (qty: ${after})`);
        } else {
          showToast(`${food.name}${sizeLabel}: quantity increased to ${after} in ${pack}`);
        }
      } else if (after === 0) {
        showToast(`${food.name}${sizeLabel} removed from ${pack}`);
      } else {
        showToast(`${food.name}${sizeLabel}: quantity decreased to ${after} in ${pack}`);
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
