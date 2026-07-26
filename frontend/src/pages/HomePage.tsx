import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CreditCard,
  Leaf,
  MapPin,
  Star,
  Truck,
} from 'lucide-react';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { FoodMenuCard } from '../components/ui/FoodMenuCard';
import { fetchMenuCatalog, MENU_CATALOG_KEY } from '../services/menu-catalog';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import { useSiteContentData } from '../hooks/useSiteContent';
import { useCart } from '../contexts/CartContext';
import type { Food } from '../types';

const MENU_CATEGORIES = ['swallow', 'meals', 'protein', 'sides', 'soups'];

const TRUST = [
  { icon: Star, label: '4.9 Customer rating' },
  { icon: Truck, label: '30–45 min delivery' },
  { icon: Leaf, label: 'Fresh daily' },
  { icon: CreditCard, label: 'Secure payment' },
  { icon: MapPin, label: 'Ogijo location' },
];

export default function HomePage() {
  const { packs, currentPackIndex } = useCart();
  const packIndex = packs.length === 0 ? 0 : currentPackIndex;
  const packName =
    packs.length === 0 ? 'Pack 1' : packs[packIndex]?.name ?? `Pack ${packIndex + 1}`;
  const { getQuantity, changeQuantity } = useFoodPackQuantity(packIndex, packName);
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

      {/* Trust strip */}
      <section className="border-y border-brand-subtle bg-brand-dark-light">
        <div className="site-container">
          <ul className="flex gap-6 overflow-x-auto py-5 scrollbar-none sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:py-6">
            {TRUST.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex min-w-[9.5rem] shrink-0 items-center gap-2.5 sm:min-w-0 sm:justify-center"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium text-secondary">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="content-auto section-pad bg-brand-dark">
        <div className="site-container">
          <div className="mx-auto mb-12 max-w-2xl text-center animate-fade-up">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Why order with <span className="text-brand-gold">Ay Food Palace</span>
            </h2>
            <p className="mt-3 text-secondary">
              Premium Nigerian meals, prepared fresh and delivered hot from Ogijo.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {home.features.map((feature, index) => (
              <div
                key={`${feature.title}-${index}`}
                className="rounded-3xl border border-brand-subtle bg-brand-card p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-gold/25"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gold/12 text-sm font-bold text-brand-gold">
                  0{index + 1}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular dishes */}
      <section className="content-auto section-pad bg-brand-dark-light">
        <div className="site-container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {home.popularHeading}{' '}
              <span className="text-gradient">{home.popularHighlight}</span>
            </h2>
            <p className="mt-3 text-secondary">{home.popularSubheading}</p>
          </div>

          {isLoading ? (
            <div className="food-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-3xl bg-brand-card" />
              ))}
            </div>
          ) : (
            <div className="food-grid">
              {nigerianDishes.map((food, index) => (
                <FoodMenuCard
                  key={food.id}
                  food={food}
                  priority={index < 3}
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

          <div className="mt-12 text-center">
            <Link to={home.popularCtaTo} className="btn-secondary">
              {home.popularCtaLabel} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="content-auto section-pad bg-brand-dark">
        <div className="site-container">
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-subtle px-8 py-16 text-center sm:px-12 sm:py-20">
            <img
              src="/assets/hero-signature.webp"
              alt=""
              width={1280}
              height={1670}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full max-w-none object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/78 to-black/70" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 80% 70% at 70% 50%, rgb(249 115 22 / 0.22), transparent 55%), radial-gradient(ellipse 50% 60% at 20% 80%, rgb(107 142 35 / 0.12), transparent 50%)',
              }}
            />
            <div className="relative">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-gold/90">
                Ay Food Mega Palace
              </p>
              <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {home.ctaHeading}
              </h2>
              <p className="mx-auto mb-9 max-w-md text-base leading-relaxed text-secondary sm:text-lg">
                {home.ctaBody}
              </p>
              <Link to={home.ctaButtonTo} className="btn-primary btn-ripple">
                {home.ctaButtonLabel} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
