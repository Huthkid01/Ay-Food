import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { fetchMenuCatalog, MENU_CATALOG_KEY } from '../services/menu-catalog';
import { cn } from '../utils/helpers';
import { filterMenuFoods } from '../data/nigerian-menu';
import { FoodMenuCard } from '../components/ui/FoodMenuCard';
import { useSiteContentData } from '../hooks/useSiteContent';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import type { Food } from '../types';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { getQuantity, changeQuantity } = useFoodPackQuantity(0, 'Pack 1');
  const { menuPage } = useSiteContentData();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: catalog, isLoading } = useQuery({
    queryKey: MENU_CATALOG_KEY,
    queryFn: fetchMenuCatalog,
    staleTime: 30_000,
  });

  const categories = catalog?.categories ?? [];
  const allFoods = catalog?.foods;

  const displayedFoods = useMemo(
    () => filterMenuFoods(allFoods ?? [], category, debouncedSearch),
    [allFoods, category, debouncedSearch]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 font-display text-4xl font-bold">
        {menuPage.title} <span className="text-gradient">{menuPage.titleHighlight}</span>
      </h1>
      <p className="mb-6 text-white/60">
        {menuPage.subtitle} · {displayedFoods.length} items from the A.Y Food Mega Palace menu
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

      {isLoading ? (
        <div className="food-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-brand-dark-light" />
          ))}
        </div>
      ) : displayedFoods.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="text-xl font-semibold">
            {catalog?.source === 'empty' && !search && !category
              ? 'Menu unavailable'
              : 'No items found'}
          </h3>
          <p className="mt-2 text-white/60">
            {catalog?.source === 'empty' && !search && !category
              ? 'Please check back soon — dishes will appear once the kitchen menu is online.'
              : 'Try different keywords or browse our categories'}
          </p>
          {(search || category) && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
              }}
              className="mt-4 rounded-full bg-brand-gold px-6 py-2 font-semibold text-white"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="food-grid">
          {displayedFoods.map((food: Food) => (
            <FoodMenuCard
              key={food.id}
              food={food}
              showCategory
              showDescription
              addLabelEmpty="Add to Cart"
              getQuantity={(portionId) => getQuantity(food, portionId)}
              onChangeQuantity={(delta, portionId) => changeQuantity(food, delta, portionId)}
              onAdd={(portionId) => changeQuantity(food, 1, portionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
