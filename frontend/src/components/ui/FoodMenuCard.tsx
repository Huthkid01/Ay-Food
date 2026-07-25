import { useState } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { FoodImage } from './FoodImage';
import { formatMenuPrice } from '../../data/nigerian-menu';
import { formatCurrency } from '../../utils/helpers';
import { resolveFoodImage } from '../../utils/food-images';
import type { Food } from '../../types';

type Props = {
  food: Food;
  getQuantity: (portionId: string) => number;
  onChangeQuantity: (delta: number, portionId: string) => void;
  onAdd: (portionId: string) => void;
  addLabelEmpty?: string;
  addLabelMore?: string;
  showCategory?: boolean;
  showDescription?: boolean;
};

export function FoodMenuCard({
  food,
  getQuantity,
  onChangeQuantity,
  onAdd,
  addLabelEmpty = 'Add to Pack',
  addLabelMore = 'Add Another',
  showCategory = false,
  showDescription = false,
}: Props) {
  const [portionId, setPortionId] = useState(food.portions[0]?.id ?? '');
  const selected = food.portions.find((p) => p.id === portionId) ?? food.portions[0];
  const multi = food.portions.length > 1;
  const quantity = selected ? getQuantity(selected.id) : 0;
  const priceLabel = selected
    ? formatCurrency(selected.price)
    : formatMenuPrice(food.portions);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light transition hover:border-brand-gold/50">
      <div className="relative aspect-video overflow-hidden">
        <FoodImage
          src={resolveFoodImage(food)}
          alt={food.name}
          className="h-full w-full object-cover"
        />
        {food.isPopular && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-brand-gold px-2 py-1 text-xs font-semibold text-white">
            <Star size={12} className="fill-white" /> Popular
          </span>
        )}
      </div>
      <div className="p-4">
        {showCategory && (
          <span className="mb-1 inline-block rounded-full bg-brand-green/20 px-2 py-0.5 text-xs text-brand-green">
            {food.category.name}
          </span>
        )}
        <h3 className="mb-1 font-semibold">{food.name}</h3>
        {showDescription && food.description && (
          <p className="mb-2 text-sm text-white/60">{food.description}</p>
        )}
        {multi && (
          <select
            value={selected?.id}
            onChange={(e) => setPortionId(e.target.value)}
            className="mb-2 w-full rounded-lg border border-white/10 bg-brand-dark px-2 py-2 text-sm outline-none focus:border-brand-gold"
          >
            {food.portions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.portion.name}
                {` — ${formatCurrency(p.price)}`}
              </option>
            ))}
          </select>
        )}
        <p className="mb-3 font-bold text-brand-gold">
          {multi && !selected ? formatMenuPrice(food.portions) : priceLabel}
        </p>
        <div className="mb-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => selected && onChangeQuantity(-1, selected.id)}
            disabled={quantity === 0 || !selected}
            className="rounded-full p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={16} />
          </button>
          <span className="w-6 text-center font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => selected && onChangeQuantity(1, selected.id)}
            disabled={!selected}
            className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => selected && onAdd(selected.id)}
          disabled={!selected}
          className="w-full rounded-full bg-brand-gold py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-50"
        >
          {quantity > 0 ? addLabelMore : addLabelEmpty}
        </button>
      </div>
    </div>
  );
}
