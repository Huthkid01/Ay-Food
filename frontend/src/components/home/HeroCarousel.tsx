import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin, Star } from 'lucide-react';
import { useSiteContentData } from '../../hooks/useSiteContent';
import {
  HERO_IMAGE,
  HERO_INTERIOR_1,
  HERO_INTERIOR_2,
} from '../../utils/food-images';

const SLIDE_INTERVAL = 4500;
const RATING = '4.9';
const DELIVERY_ETA = '30–45 min';

/** Map temporary food-hero URLs back to the original three palace images */
const FOOD_TO_ORIGINAL: Record<string, string> = {
  'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?auto=format&fit=crop&w=1920&h=1080&q=80&fm=webp':
    HERO_IMAGE,
  '/assets/ariwo-ogunfe-ati-eko.jpeg': HERO_INTERIOR_1,
  '/assets/eshama-miliki.jpeg': HERO_INTERIOR_2,
};

function resolveHeroImage(src: string) {
  if (src.includes('photo-1664992960082-0ea299a9c53e')) return HERO_IMAGE;
  return FOOD_TO_ORIGINAL[src] ?? src;
}

function isOpenNow() {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

export function HeroCarousel() {
  const content = useSiteContentData();
  const slides = content.heroSlides.filter((s) => s.active !== false);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const open = isOpenNow();

  const count = slides.length || 1;

  const goTo = useCallback(
    (index: number) => {
      setCurrent((index + count) % count);
    },
    [count]
  );

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    setCurrent((c) => (c >= count ? 0 : c));
  }, [count]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, next, slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const nextIndex = (current + 1) % count;
    const toWarm = [slides[current], slides[nextIndex]];
    toWarm.forEach((s) => {
      if (!s?.image) return;
      const img = new Image();
      img.src = resolveHeroImage(s.image);
    });
  }, [current, count, slides]);

  if (slides.length === 0) return null;

  const raw = slides[current] ?? slides[0];
  const slide =
    raw.title.trim() === 'Ay' && (raw.highlight ?? '').toLowerCase() === 'food'
      ? {
          ...raw,
          tagline: 'Ogijo · Fresh daily',
          title: 'Fresh Nigerian Meals,',
          highlight: 'Delivered Hot.',
          description:
            'Order authentic Nigerian dishes prepared fresh daily from our Ogijo kitchen.',
          primaryCta: { label: 'Order Now', to: raw.primaryCta.to || '/menu' },
          secondaryCta: { label: 'Browse Menu', to: '/menu' },
          image: resolveHeroImage(raw.image),
        }
      : { ...raw, image: resolveHeroImage(raw.image) };

  return (
    <section
      className="relative flex min-h-screen w-full items-center overflow-hidden bg-brand-dark"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Ay Food highlights"
    >
      <div className="absolute inset-0 w-full">
        <AnimatePresence>
          <motion.div
            key={`${slide.image}-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full"
          >
            <img
              src={slide.image}
              alt=""
              className="absolute inset-0 h-full w-full max-w-none object-cover"
              style={{ objectPosition: slide.imagePosition ?? 'center' }}
              fetchPriority={current === 0 ? 'high' : 'auto'}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-black/30" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="site-container relative w-full pb-36 pt-28 sm:pb-28 sm:pt-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={`copy-${current}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.15, duration: 0.55, ease: 'easeOut' },
            }}
            exit={{
              opacity: 0,
              y: -12,
              transition: { duration: 0.25, ease: 'easeIn' },
            }}
            className="max-w-3xl"
          >
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {open ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/20 px-3 py-1 text-xs font-semibold text-[#B8D96A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                  Open Now
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <Star size={12} className="fill-brand-gold text-brand-gold" />
                {RATING} rating
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <Clock size={12} className="text-brand-gold" />
                {DELIVERY_ETA}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                <MapPin size={12} className="text-brand-gold" />
                Ogijo
              </span>
            </div>

            <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-brand-gold/90">
              {slide.tagline}
            </p>
            <h1 className="mb-5 font-display text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
              {slide.title}
              {slide.highlight ? (
                <>
                  <br className="hidden sm:block" />{' '}
                  <span className="text-brand-gold">{slide.highlight}</span>
                </>
              ) : null}
            </h1>
            <p className="mb-9 max-w-xl text-base leading-relaxed text-secondary sm:text-lg">
              {slide.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link to={slide.primaryCta.to} className="btn-primary btn-ripple">
                {slide.primaryCta.label} <ArrowRight size={18} />
              </Link>
              <Link to={slide.secondaryCta.to} className="btn-secondary">
                {slide.secondaryCta.label}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 sm:bottom-8 sm:gap-4">
        <button
          type="button"
          onClick={prev}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:hidden"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((s, index) => (
            <button
              key={`${s.image}-${index}`}
              type="button"
              onClick={() => goTo(index)}
              className={`relative h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-7 bg-brand-gold sm:w-8'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === current ? 'true' : undefined}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:hidden"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
