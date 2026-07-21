import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Minus } from 'lucide-react';
import { menuApi } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/Toast';
import { formatCurrency, cn } from '../utils/helpers';
import { resolveFoodImage } from '../utils/food-images';
import { FoodImage } from '../components/ui/FoodImage';
import { NIGERIAN_MENU_FOODS, MENU_CATEGORIES, filterMenuFoods } from '../data/nigerian-menu';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import { PACK_FEE, packItemsTotal } from '../types';
import type { Food } from '../types';

export default function BuildPackPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchParams] = useSearchParams();
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const editIndex = searchParams.get('editPack');
    if (editIndex !== null) {
      const index = parseInt(editIndex, 10);
      if (!Number.isNaN(index)) selectPack(index);
    }
  }, [searchParams, selectPack]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuApi.getCategories().then((r) => r.data),
    retry: 1,
  });

  const { data: foodsData, isLoading } = useQuery({
    queryKey: ['build-all-foods'],
    queryFn: () => menuApi.getFoods({ sort: 'popular', limit: 100 }).then((r) => r.data),
    retry: 1,
  });

  const usingFallback = !foodsData?.foods?.length;
  const categories =
    categoriesData?.categories?.length ? categoriesData.categories : MENU_CATEGORIES;

  const allFoods: Food[] = usingFallback ? NIGERIAN_MENU_FOODS : foodsData!.foods;

  const foods = useMemo(
    () => filterMenuFoods(allFoods, category, debouncedSearch),
    [allFoods, category, debouncedSearch]
  );

  function handleAddToPack(food: Food) {
    changeQuantity(food, 1);
  }

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
        Build Your Custom <span className="text-gradient">Packs</span>
      </h1>
      <p className="mb-8 text-white/60">
        Add items to Pack 1, then create Pack 2 for someone else — just like building separate meal orders.
      </p>

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
                  selectPack(index);
                  showToast(`Now editing ${pack.name}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectPack(index);
                    showToast(`Now editing ${pack.name}`);
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
                          selectPack(index);
                          showToast(`Now editing ${pack.name}`);
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
                          deletePack(index);
                          showToast(`${pack.name} deleted`);
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
              selectPack(nextIndex);
              showToast(`Pack ${nextIndex + 1} created — now editing it. Add items below.`);
            }}
            className="rounded-full bg-brand-gold px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-dark"
          >
            Add Another Pack
          </button>
          {packs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                duplicatePack(currentPackIndex);
                showToast(`Pack duplicated from ${packs[currentPackIndex]?.name}!`);
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

        {isLoading && !usingFallback ? (
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
            {foods.map((food) => {
              const price = food.portions[0]?.price ?? 0;
              const qty = getQuantity(food);
              return (
                <div
                  key={food.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light"
                >
                  <div className="aspect-video overflow-hidden">
                    <FoodImage src={resolveFoodImage(food)} alt={food.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{food.name}</h3>
                    <p className="mb-3 font-bold text-brand-gold">{formatCurrency(price)}</p>
                    <div className="mb-3 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => changeQuantity(food, -1)}
                        disabled={qty === 0}
                        className="rounded-full p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-medium">{qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(food, 1)}
                        className="rounded-full p-1.5 hover:bg-white/10"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToPack(food)}
                      className="w-full rounded-full bg-brand-gold py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark"
                    >
                      {qty > 0 ? 'Add Another' : 'Add to Pack'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
