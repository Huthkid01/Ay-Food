import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, Plus, Minus, ChefHat, Clock, Shield } from 'lucide-react';
import { resolveFoodImage } from '../utils/food-images';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { FoodImage } from '../components/ui/FoodImage';
import { menuApi } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { useFoodPackQuantity } from '../hooks/useFoodPackQuantity';
import type { Food } from '../types';

const NIGERIAN_CATEGORIES = ['rice', 'swallow', 'soup', 'proteins', 'breakfast'];

const FALLBACK_NIGERIAN_DISHES: Food[] = [
  {
    id: 'jollof-rice',
    name: 'Jollof Rice',
    slug: 'jollof-rice',
    description: 'Smoky party-style jollof with rich tomato base',
    tags: 'popular,spicy',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 25,
    category: { name: 'Rice', slug: 'rice' },
    portions: [{ id: 'jollof-medium', price: 1200, portion: { id: 'p1', name: 'Medium', slug: 'medium' } }],
  },
  {
    id: 'pounded-yam',
    name: 'Pounded Yam',
    slug: 'pounded-yam',
    description: 'Soft hand-pounded yam',
    tags: 'popular',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 20,
    category: { name: 'Swallow', slug: 'swallow' },
    portions: [{ id: 'yam-medium', price: 1200, portion: { id: 'p2', name: 'Medium', slug: 'medium' } }],
  },
  {
    id: 'egusi-soup',
    name: 'Egusi Soup',
    slug: 'egusi-soup',
    description: 'Rich melon seed soup with leafy greens',
    tags: 'popular',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 30,
    category: { name: 'Soup', slug: 'soup' },
    portions: [{ id: 'egusi-medium', price: 1800, portion: { id: 'p3', name: 'Medium', slug: 'medium' } }],
  },
  {
    id: 'efo-riro',
    name: 'Efo Riro',
    slug: 'efo-riro',
    description: 'Spinach stew with assorted meat',
    tags: 'popular',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 28,
    category: { name: 'Soup', slug: 'soup' },
    portions: [{ id: 'efo-medium', price: 1700, portion: { id: 'p4', name: 'Medium', slug: 'medium' } }],
  },
  {
    id: 'amala',
    name: 'Amala',
    slug: 'amala',
    description: 'Smooth yam flour swallow',
    tags: 'popular',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 15,
    category: { name: 'Swallow', slug: 'swallow' },
    portions: [{ id: 'amala-medium', price: 900, portion: { id: 'p5', name: 'Medium', slug: 'medium' } }],
  },
  {
    id: 'pepper-soup',
    name: 'Pepper Soup',
    slug: 'pepper-soup',
    description: 'Spicy aromatic broth',
    tags: 'spicy',
    isPopular: true,
    isNew: false,
    prepTimeMinutes: 25,
    category: { name: 'Soup', slug: 'soup' },
    portions: [{ id: 'pepper-medium', price: 2000, portion: { id: 'p6', name: 'Medium', slug: 'medium' } }],
  },
];

export default function HomePage() {
  const { getQuantity, changeQuantity } = useFoodPackQuantity(0, 'Pack 1');

  const { data: foodsData, isLoading } = useQuery({
    queryKey: ['popular-nigerian-dishes'],
    queryFn: () => menuApi.getFoods({ sort: 'popular', limit: 50 }).then((r) => r.data),
    retry: 1,
  });

  const nigerianDishes: Food[] = (() => {
    const fromApi = (foodsData?.foods ?? []).filter((food: Food) =>
      NIGERIAN_CATEGORIES.includes(food.category.slug)
    );
    if (fromApi.length >= 6) return fromApi.slice(0, 6);
    if (fromApi.length > 0) return fromApi;
    return FALLBACK_NIGERIAN_DISHES;
  })();

  function handleAddToCart(food: Food) {
    changeQuantity(food, 1);
  }

  return (
    <div>
      <HeroCarousel />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ChefHat, title: 'Authentic Recipes', desc: 'Traditional Yoruba cuisine made fresh daily' },
            { icon: Clock, title: 'Fast Delivery', desc: 'Hot meals delivered across Ogijo and Ikorodu' },
            { icon: Shield, title: 'Secure Payment', desc: 'Pay with Paystack, Flutterwave or Stripe' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
              <Icon className="mb-3 text-brand-gold" size={28} />
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-white/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Nigerian dishes — with add to cart */}
      <section className="bg-brand-dark-light py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center font-display text-4xl font-bold">
            Popular <span className="text-gradient">Nigerian Dishes</span>
          </h2>
          <p className="mb-10 text-center text-white/60">Customer favorites you&apos;ll love</p>

          {isLoading ? (
            <div className="food-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-brand-dark" />
              ))}
            </div>
          ) : (
            <div className="food-grid">
              {nigerianDishes.map((food) => {
                const price = food.portions[0]?.price ?? 0;
                const qty = getQuantity(food);
                return (
                  <div
                    key={food.id}
                    className="group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark transition hover:border-brand-gold/50"
                  >
                    <div className="relative aspect-video overflow-hidden bg-brand-dark-light">
                      <FoodImage
                        src={resolveFoodImage(food)}
                        alt={food.name}
                        className="h-full w-full transition group-hover:scale-105"
                      />
                      {food.isPopular && (
                        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brand-gold/90 px-2 py-1 text-xs font-semibold text-white">
                          <Star size={12} className="fill-white" /> Popular
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="mb-1 inline-block rounded-full bg-brand-green/20 px-2 py-0.5 text-xs text-brand-green">
                        {food.category.name}
                      </span>
                      <h3 className="font-semibold">{food.name}</h3>
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

          <div className="mt-10 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 rounded-full border border-brand-gold px-8 py-3 font-semibold text-brand-gold transition hover:bg-brand-gold hover:text-white"
            >
              View Full Menu <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-brand-green/30 bg-gradient-to-r from-brand-gold/20 to-brand-green/10 p-10 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold">Ready to Order?</h2>
          <p className="mb-6 text-white/60">No account needed — browse, add to cart, and checkout in minutes.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-3 font-semibold text-white hover:bg-brand-gold-dark"
          >
            Start Ordering <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
