import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Minus } from 'lucide-react';
import { fetchMenuCatalog, MENU_CATALOG_KEY } from '../services/menu-catalog';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/Toast';
import { formatCurrency, cn } from '../utils/helpers';
import { filterMenuFoods } from '../data/nigerian-menu';
import { FoodMenuCard } from '../components/ui/FoodMenuCard';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import { useSiteContentData } from '../hooks/useSiteContent';
import { PACK_FEE, packItemsTotal } from '../types';
import type { Food } from '../types';

export default function BuildPackPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    packs,
    currentPackIndex,
    addPack,
    duplicatePack,
    deletePack,
    selectPack,
    removePackItem,
    updatePackItemQuantity,
  } = useCart();
  const targetPackIndex = packs.length === 0 ? 0 : currentPackIndex;
  const activePackName =
    packs.length === 0 ? 'Pack 1' : packs[currentPackIndex]?.name ?? `Pack ${currentPackIndex + 1}`;
  const { getQuantity, changeQuantity } = useFoodPackQuantity(targetPackIndex, activePackName);
  const { showToast } = useToast();
  const { buildPage } = useSiteContentData();

  const editPackParam = searchParams.get('editPack');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /** Apply ?editPack= only when the URL param / pack count changes — clamp invalid indexes */
  useEffect(() => {
    if (editPackParam === null) return;
    const parsed = parseInt(editPackParam, 10);
    if (Number.isNaN(parsed)) return;
    if (packs.length === 0) return;

    const clamped = Math.min(Math.max(0, parsed), packs.length - 1);
    if (clamped !== parsed) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('editPack', String(clamped));
          return next;
        },
        { replace: true }
      );
      return;
    }

    selectPack(clamped);
  }, [editPackParam, packs.length, selectPack, setSearchParams]);

  function focusPack(index: number, toastMsg?: string) {
    selectPack(index);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('editPack', String(index));
        return next;
      },
      { replace: true }
    );
    if (toastMsg) showToast(toastMsg);
  }

  const { data: catalog, isLoading } = useQuery({
    queryKey: MENU_CATALOG_KEY,
    queryFn: fetchMenuCatalog,
    staleTime: 30_000,
  });

  const categories = catalog?.categories ?? [];
  const allFoods = catalog?.foods;

  const foods = useMemo(
    () => filterMenuFoods(allFoods ?? [], category, debouncedSearch),
    [allFoods, category, debouncedSearch]
  );

  function notifyPackQtyChange(
    foodName: string,
    packName: string,
    nextQty: number,
    removed: boolean
  ) {
    if (removed || nextQty <= 0) {
      showToast(`${foodName} removed from ${packName}`);
    } else {
      showToast(`${foodName} updated to ${nextQty} in ${packName}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 font-display text-4xl font-bold">
        {buildPage.title} <span className="text-gradient">{buildPage.titleHighlight}</span>
      </h1>
      <p className="mb-8 text-white/60">{buildPage.subtitle}</p>

      {/* Packs overview */}
      <div className="mb-8">
        {packs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-brand-dark-light p-8 text-center text-white/60">
            No packs yet. Add an item below to create Pack 1 automatically.
          </div>
        ) : (
          <div
            className={cn(
              packs.length >= 2
                ? 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3'
                : 'grid grid-cols-1 gap-4'
            )}
          >
            {packs.map((pack, index) => {
              const isEditing = index === currentPackIndex;
              return (
              <div
                key={pack.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  focusPack(index, `Now editing ${pack.name}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusPack(index, `Now editing ${pack.name}`);
                  }
                }}
                className={cn(
                  'min-w-0 cursor-pointer rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-brand-gold sm:rounded-2xl sm:p-4',
                  isEditing
                    ? 'border-brand-gold bg-brand-gold/10 ring-1 ring-brand-gold'
                    : 'border-white/10 bg-brand-dark-light hover:border-brand-gold/50'
                )}
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-brand-gold sm:text-base">{pack.name}</h3>
                    {isEditing && (
                      <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-semibold text-white">
                        Editing
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          focusPack(index, `Now editing ${pack.name}`);
                        }}
                        className="text-xs text-white/60 hover:text-brand-gold"
                      >
                        Edit
                      </button>
                    )}
                    {packs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const deletingCurrent = index === currentPackIndex;
                          deletePack(index);
                          showToast(`${pack.name} deleted`);
                          if (deletingCurrent) {
                            const fallback = Math.max(0, index - 1);
                            setSearchParams(
                              (prev) => {
                                const next = new URLSearchParams(prev);
                                next.set('editPack', String(fallback));
                                return next;
                              },
                              { replace: true }
                            );
                          } else if (index < currentPackIndex) {
                            setSearchParams(
                              (prev) => {
                                const next = new URLSearchParams(prev);
                                next.set('editPack', String(currentPackIndex - 1));
                                return next;
                              },
                              { replace: true }
                            );
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {pack.items.length === 0 ? (
                  <p className="text-xs text-white/40 sm:text-sm">Empty — add items below</p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {pack.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-1 text-xs sm:gap-2 sm:text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          {item.foodName} · {formatCurrency(item.unitPrice)}
                        </span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = item.quantity - 1;
                              updatePackItemQuantity(pack.id, item.id, next);
                              notifyPackQtyChange(item.foodName, pack.name, next, next <= 0);
                            }}
                            className="rounded p-0.5 hover:bg-white/10"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-5 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = item.quantity + 1;
                              updatePackItemQuantity(pack.id, item.id, next);
                              notifyPackQtyChange(item.foodName, pack.name, next, false);
                            }}
                            className="rounded p-0.5 hover:bg-white/10"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePackItem(pack.id, item.id);
                              showToast(`${item.foodName} removed from ${pack.name}`);
                            }}
                            className="ml-1 text-xs text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-white/10 pt-2 text-xs sm:text-sm">
                  <p className="font-medium">Total: {formatCurrency(packItemsTotal(pack))}</p>
                  <p className="text-[10px] text-brand-gold sm:text-xs">+ {formatCurrency(PACK_FEE)} pack fee</p>
                </div>
              </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const nextIndex = packs.length;
              addPack();
              focusPack(nextIndex, `Pack ${nextIndex + 1} created — now editing it. Add items below.`);
            }}
            className="rounded-full bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            Add Another Pack
          </button>
          {packs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const sourceName = packs[currentPackIndex]?.name ?? 'Pack';
                const nextIndex = packs.length;
                duplicatePack(currentPackIndex);
                focusPack(nextIndex, `Pack duplicated from ${sourceName} — now editing Pack ${nextIndex + 1}`);
              }}
              className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-brand-gold"
            >
              Duplicate Pack
            </button>
          )}
        </div>
      </div>

      {/* Available foods */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Add Food Items to{' '}
          <span className="text-brand-gold">
            {packs.length === 0 ? 'Pack 1' : packs[currentPackIndex]?.name ?? 'Selected Pack'}
          </span>
        </h2>

        <div className="relative mb-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search food items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-brand-dark-light py-3 pl-10 pr-4 outline-none focus:border-brand-gold"
          />
        </div>
        {debouncedSearch && (
          <p className="mb-4 text-sm text-white/60">
            {foods.length} item{foods.length !== 1 ? 's' : ''} found
          </p>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              !category ? 'bg-brand-gold text-white' : 'bg-brand-dark-light text-white/70 hover:text-brand-gold'
            )}
          >
            All
          </button>
          {categories.map((cat: { id: string; name: string; slug: string }) => (
            <button
              key={cat.id ?? cat.slug}
              type="button"
              onClick={() => setCategory(cat.slug)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                category === cat.slug
                  ? 'bg-brand-gold text-white'
                  : 'bg-brand-dark-light text-white/70 hover:text-brand-gold'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="food-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-brand-dark-light" />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-xl font-semibold">No items found</h3>
            <p className="mt-2 text-white/60">Try a different category or search term</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('');
              }}
              className="mt-4 rounded-full bg-brand-gold px-6 py-2 font-semibold text-white"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="food-grid">
            {foods.map((food: Food) => (
              <FoodMenuCard
                key={food.id}
                food={food}
                getQuantity={(portionId) => getQuantity(food, portionId)}
                onChangeQuantity={(delta, portionId) => changeQuantity(food, delta, portionId)}
                onAdd={(portionId) => changeQuantity(food, 1, portionId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
