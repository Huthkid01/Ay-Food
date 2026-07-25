import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChefHat, Clock, Shield } from 'lucide-react';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { FoodMenuCard } from '../components/ui/FoodMenuCard';
import { fetchMenuCatalog, MENU_CATALOG_KEY } from '../services/menu-catalog';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import { useSiteContentData } from '../hooks/useSiteContent';
import type { Food } from '../types';

const MENU_CATEGORIES = ['swallow', 'meals', 'protein', 'sides', 'soups'];
const FEATURE_ICONS = [ChefHat, Clock, Shield];

export default function HomePage() {
  const { getQuantity, changeQuantity } = useFoodPackQuantity(0, 'Pack 1');
  const { home } = useSiteContentData();

  const { data: catalog, isLoading } = useQuery({
    queryKey: MENU_CATALOG_KEY,
    queryFn: fetchMenuCatalog,
    staleTime: 30_000,
  });

  const nigerianDishes: Food[] = (() => {
    const list = (catalog?.foods ?? []).filter(
      (food) => food.isPopular || MENU_CATEGORIES.includes(food.category.slug)
    );
    if (list.length >= 6) return list.slice(0, 6);
    return (catalog?.foods ?? []).slice(0, 6);
  })();

  return (
    <div>
      <HeroCarousel />

      <section className="content-auto mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {home.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? ChefHat;
            return (
              <div
                key={`${feature.title}-${index}`}
                className="rounded-2xl border border-white/10 bg-brand-dark-light p-6"
              >
                <Icon className="mb-3 text-brand-gold" size={28} />
                <h3 className="mb-1 font-semibold">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-auto bg-brand-dark-light py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center font-display text-4xl font-bold">
            {home.popularHeading}{' '}
            <span className="text-gradient">{home.popularHighlight}</span>
          </h2>
          <p className="mb-10 text-center text-white/60">{home.popularSubheading}</p>

          {isLoading ? (
            <div className="food-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-brand-dark" />
              ))}
            </div>
          ) : (
            <div className="food-grid">
              {nigerianDishes.map((food) => (
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

          <div className="mt-10 text-center">
            <Link
              to={home.popularCtaTo}
              className="inline-flex items-center gap-2 rounded-full border border-brand-gold px-8 py-3 font-semibold text-brand-gold transition hover:bg-brand-gold hover:text-white"
            >
              {home.popularCtaLabel} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="content-auto mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-brand-green/30 bg-gradient-to-r from-brand-gold/20 to-brand-green/10 p-10 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold">{home.ctaHeading}</h2>
          <p className="mb-6 text-white/60">{home.ctaBody}</p>
          <Link
            to={home.ctaButtonTo}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-3 font-semibold text-white hover:bg-brand-gold-dark"
          >
            {home.ctaButtonLabel} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
