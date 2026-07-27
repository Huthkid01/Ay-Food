import { useState, useCallback } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { FoodImage } from './FoodImage';
import { FoodImageLightbox, FoodImageZoomHint } from './FoodImageLightbox';
import { formatMenuPrice } from '../../data/nigerian-menu';
import { cn, formatCurrency } from '../../utils/helpers';
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
  /** Eager-load image for above-the-fold cards */
  priority?: boolean;
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
  priority = false,
}: Props) {
  const [portionId, setPortionId] = useState(food.portions[0]?.id ?? '');
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const selected = food.portions.find((p) => p.id === portionId) ?? food.portions[0];
  const multi = food.portions.length > 1;
  const quantity = selected ? getQuantity(selected.id) : 0;
  const priceLabel = selected
    ? formatCurrency(selected.price)
    : formatMenuPrice(food.portions);
  const imageSrc = resolveFoodImage(food);

  return (
    <div className="food-card-slot">
      <article className="food-card group flex min-w-0 flex-col">
        <button
          type="button"
          className="relative aspect-[4/3] cursor-zoom-in overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          onClick={() => setViewerOpen(true)}
          aria-label={`View ${food.name} image`}
        >
          <FoodImage
            src={imageSrc}
            alt={food.name}
            priority={priority}
            className="food-card-image h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {food.isPopular && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
              <Star size={11} className="fill-white" /> Popular
            </span>
          )}
          <FoodImageZoomHint />
        </button>

        <FoodImageLightbox
          open={viewerOpen}
          onClose={closeViewer}
          src={imageSrc}
          alt={food.name}
        />

        <div className="flex flex-col p-4 sm:p-5">
          {showCategory && (
            <span className="mb-2 inline-flex w-fit rounded-full bg-brand-green/15 px-2.5 py-0.5 text-[11px] font-medium text-[#A3C04A]">
              {food.category.name}
            </span>
          )}
          <h3 className="mb-1 text-[0.95rem] font-semibold leading-snug text-white sm:text-base">
            {food.name}
          </h3>
          {showDescription && food.description && (
            <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-secondary">
              {food.description}
            </p>
          )}

          {/* Custom size picker — native <select> truncates prices on mobile */}
          {multi && (
            <div className="mb-2 space-y-1.5" role="listbox" aria-label="Choose size">
              {food.portions.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setPortionId(p.id)}
                    className={cn(
                      'flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                      active
                        ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                        : 'border-brand-subtle bg-brand-dark text-white/85 hover:border-brand-gold/40',
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{p.portion.name}</span>
                    <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
                      {formatCurrency(p.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p
            className={cn(
              'text-lg font-bold tabular-nums text-brand-gold',
              multi ? 'mb-3' : 'mb-3',
            )}
          >
            {multi && !selected ? formatMenuPrice(food.portions) : priceLabel}
          </p>

          {/* No mt-auto — avoids huge empty gap on single-size cards in a tall grid row */}
          <div className="space-y-3">
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
    </div>
  );
}
