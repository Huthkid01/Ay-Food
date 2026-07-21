import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HERO_SLIDES } from '../../utils/food-images';

const AUTO_ADVANCE_MS = 6000;
const SWIPE_THRESHOLD = 50;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

  const goTo = useCallback((next: number) => {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => goTo(index + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [index, goTo]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) goTo(index + 1);
    else goTo(index - 1);
  }

  return (
    <section
      className="relative flex min-h-[85vh] items-center overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.image}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1.05 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${slide.image})`,
            backgroundPosition: slide.imagePosition ?? 'center',
          }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/75 to-brand-dark/30" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl"
          >
            <p className="mb-2 text-sm font-medium tracking-widest text-brand-green uppercase">
              {slide.tagline}
            </p>
            <h1 className="mb-4 font-display text-5xl font-bold leading-tight lg:text-6xl">
              {slide.title}{' '}
              {slide.highlight && (
                <span className="text-gradient">{slide.highlight}</span>
              )}
            </h1>
            <p className="mb-8 text-lg text-white/75">{slide.description}</p>
            <div className="flex flex-wrap gap-4">
              <Link
                to={slide.primaryCta.to}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                {slide.primaryCta.label} <ArrowRight size={18} />
              </Link>
              <Link
                to={slide.secondaryCta.to}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3 font-semibold transition hover:border-brand-gold hover:text-brand-gold"
              >
                {slide.secondaryCta.label}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            className={`h-2.5 rounded-full transition-all ${
              i === index ? 'w-8 bg-brand-gold' : 'w-2.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
