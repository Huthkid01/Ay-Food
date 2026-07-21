import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Minus, Star } from 'lucide-react';
import { menuApi } from '../services/api';
import { formatCurrency, cn } from '../utils/helpers';
import { resolveFoodImage } from '../utils/food-images';
import { FoodImage } from '../components/ui/FoodImage';
import { NIGERIAN_MENU_FOODS, MENU_CATEGORIES, filterMenuFoods } from '../data/nigerian-menu';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import type { Food } from '../types';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { getQuantity, changeQuantity } = useFoodPackQuantity(0, 'Pack 1');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuApi.getCategories().then((r) => r.data),
    retry: 1,
  });

  const { data: foodsData, isLoading } = useQuery({
    queryKey: ['foods-menu-all'],
    queryFn: () => menuApi.getFoods({ sort: 'popular', limit: 100 }).then((r) => r.data),
    retry: 1,
  });

  const usingFallback = !foodsData?.foods?.length;
  const categories =
    categoriesData?.categories?.length ? categoriesData.categories : MENU_CATEGORIES;

  const allFoods: Food[] = usingFallback ? NIGERIAN_MENU_FOODS : foodsData!.foods;

  const displayedFoods = useMemo(
    () => filterMenuFoods(allFoods, category, debouncedSearch),
    [allFoods, category, debouncedSearch]
  );

  function handleAddToCart(food: Food) {
    changeQuantity(food, 1);
  }

  const nigerianCount = allFoods.filter((f) =>
    ['rice', 'swallow', 'soup', 'proteins', 'breakfast'].includes(f.category.slug)
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 font-display text-4xl font-bold">
        Our <span className="text-gradient">Menu</span>
      </h1>
      <p className="mb-6 text-white/60">
        {displayedFoods.length} dishes shown · {nigerianCount}+ authentic Nigerian meals
      </p>
      <div className="mb-6">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search for food items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-brand-dark-light py-3 pl-10 pr-4 outline-none focus:border-brand-gold"
          />
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-sm text-white/60">
            {displayedFoods.length} item{displayedFoods.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
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
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-brand-dark-light" />
          ))}
        </div>
      ) : displayedFoods.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="text-xl font-semibold">No items found</h3>
          <p className="mt-2 text-white/60">Try different keywords or browse our categories</p>
          <button
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
          {displayedFoods.map((food) => {
            const price = food.portions[0]?.price ?? 0;
            const qty = getQuantity(food);
            return (
              <div
                key={food.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light transition hover:border-brand-gold/50"
              >
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
                  <span className="mb-1 inline-block rounded-full bg-brand-green/20 px-2 py-0.5 text-xs text-brand-green">
                    {food.category.name}
                  </span>
                  <h3 className="mb-1 font-semibold">{food.name}</h3>
                  <p className="mb-3 text-sm text-white/60">{food.description}</p>
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
                    onClick={() => handleAddToCart(food)}
                    className="w-full rounded-full bg-brand-gold py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark"
                  >
                    {qty > 0 ? 'Add Another' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
