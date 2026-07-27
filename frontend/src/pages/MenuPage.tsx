import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { fetchMenuCatalog, MENU_CATALOG_KEY } from '../services/menu-catalog';
import { cn } from '../utils/helpers';
import { filterMenuFoods } from '../data/nigerian-menu';
import { FoodMenuCard } from '../components/ui/FoodMenuCard';
import { useSiteContentData } from '../hooks/useSiteContent';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import { useCart } from '../contexts/CartContext';
import type { Food } from '../types';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { packs, currentPackIndex } = useCart();
  const packIndex = packs.length === 0 ? 0 : currentPackIndex;
  const packName =
    packs.length === 0 ? 'Pack 1' : packs[packIndex]?.name ?? `Pack ${packIndex + 1}`;
  const { getQuantity, changeQuantity } = useFoodPackQuantity(packIndex, packName);
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
    <div className="site-container section-pad pt-10 sm:pt-12">
      <h1 className="mb-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {menuPage.title} <span className="text-gradient">{menuPage.titleHighlight}</span>
      </h1>
      <p className="mb-8 max-w-2xl text-secondary">
        {menuPage.subtitle}
        {packs.length > 0 ? (
          <>
            {' '}
            · Adding to <span className="font-medium text-brand-gold">{packName}</span>
          </>
        ) : null}
      </p>
      <div className="mb-8">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search for food items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-brand-subtle bg-brand-card py-3.5 pl-11 pr-4 outline-none transition focus:border-brand-gold"
          />
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-sm text-secondary">
            {displayedFoods.length} item{displayedFoods.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition',
            !category
              ? 'bg-brand-gold text-white shadow-[0_8px_20px_rgb(249_115_22/0.25)]'
              : 'bg-brand-card text-secondary hover:text-brand-gold',
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
                ? 'bg-brand-gold text-white shadow-[0_8px_20px_rgb(249_115_22/0.25)]'
                : 'bg-brand-card text-secondary hover:text-brand-gold',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="food-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl bg-brand-card" />
          ))}
        </div>
      ) : displayedFoods.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="font-display text-2xl font-semibold">
            {catalog?.source === 'empty' && !search && !category
              ? 'Menu unavailable'
              : 'No items found'}
          </h3>
          <p className="mt-2 text-secondary">
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
              className="btn-primary btn-ripple mt-6"
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
