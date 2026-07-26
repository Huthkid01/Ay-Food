import { useState } from 'react';
import { Clock, Minus, Plus, Star } from 'lucide-react';
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
  addLabelEmpty = 'Add to Cart',
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
  const prep = food.prepTimeMinutes || 25;

  return (
    <article className="food-card group flex min-w-0 flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        <FoodImage
          src={resolveFoodImage(food)}
          alt={food.name}
          className="food-card-image h-full w-full object-cover transition-transform duration-500 ease-out"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {food.isPopular && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
            <Star size={11} className="fill-white" /> Popular
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <Clock size={11} className="text-brand-gold" />
          {prep} min
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {showCategory && (
          <span className="mb-2 inline-flex w-fit rounded-full bg-brand-green/15 px-2.5 py-0.5 text-[11px] font-medium text-[#A3C04A]">
            {food.category.name}
          </span>
        )}
        <h3 className="mb-1 text-[0.95rem] font-semibold leading-snug text-white sm:text-base">
          {food.name}
        </h3>
        {showDescription && food.description && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-secondary">
            {food.description}
          </p>
        )}
        {multi && (
          <select
            value={selected?.id}
            onChange={(e) => setPortionId(e.target.value)}
            className="mb-3 w-full rounded-xl border border-brand-subtle bg-brand-dark px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold"
          >
            {food.portions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.portion.name}
                {` — ${formatCurrency(p.price)}`}
              </option>
            ))}
          </select>
        )}

        <p className="mb-4 text-lg font-bold text-brand-gold">
          {multi && !selected ? formatMenuPrice(food.portions) : priceLabel}
        </p>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => selected && onChangeQuantity(-1, selected.id)}
              disabled={quantity === 0 || !selected}
              className="rounded-full border border-brand-subtle p-2 text-secondary transition hover:border-brand-gold/40 hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => selected && onChangeQuantity(1, selected.id)}
              disabled={!selected}
              className="rounded-full border border-brand-subtle p-2 text-secondary transition hover:border-brand-gold/40 hover:text-brand-gold disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => selected && onAdd(selected.id)}
            disabled={!selected}
            className="btn-primary btn-ripple w-full rounded-2xl py-2.5 text-sm disabled:opacity-50"
          >
            {quantity > 0 ? addLabelMore : addLabelEmpty}
          </button>
        </div>
      </div>
    </article>
  );
}
