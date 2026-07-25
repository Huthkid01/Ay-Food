import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteContentData } from '../../hooks/useSiteContent';

const SLIDE_INTERVAL = 3000;

export function HeroCarousel() {
  const content = useSiteContentData();
  const slides = content.heroSlides.filter((s) => s.active !== false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const count = slides.length || 1;

  const goTo = useCallback(
    (index: number, dir: number) => {
      setDirection(dir);
      setCurrent((index + count) % count);
    },
    [count]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setDirection(-1);
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
      img.src = s.image;
    });
  }, [current, count, slides]);

  if (slides.length === 0) return null;

  const slide = slides[current] ?? slides[0];

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden bg-brand-dark"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Ay Food highlights"
    >
      <div className="absolute inset-0">
        <AnimatePresence>
          <motion.div
            key={`${slide.image}-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: slide.imagePosition ?? 'center' }}
              fetchPriority={current === 0 ? 'high' : 'auto'}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/75 to-brand-dark/40" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-36 pt-28 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`copy-${current}`}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { delay: 0.4, duration: 0.5, ease: 'easeOut' },
            }}
            exit={{
              opacity: 0,
              x: direction * -40,
              transition: { duration: 0.25, ease: 'easeIn' },
            }}
            className="max-w-3xl"
          >
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-brand-green">
              {slide.tagline}
            </span>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {slide.title}{' '}
              {slide.highlight && <span className="text-gradient">{slide.highlight}</span>}
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
              {slide.description}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to={slide.primaryCta.to}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold px-8 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
              >
                {slide.primaryCta.label} <ArrowRight size={18} />
              </Link>
              <Link
                to={slide.secondaryCta.to}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-8 py-3 font-semibold transition hover:border-brand-gold hover:text-brand-gold"
              >
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
              onClick={() => goTo(index, index >= current ? 1 : -1)}
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
