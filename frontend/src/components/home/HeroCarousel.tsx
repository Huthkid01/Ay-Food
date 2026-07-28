import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Truck,
} from 'lucide-react';
import {
  heroMobileSrc,
  normalizeHeroImage,
  type HeroSlide,
} from '../../utils/food-images';
import { cn } from '../../utils/helpers';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { DEFAULT_SITE_CONTENT } from '../../data/default-site-content';
import {
  TypewriterHeadline,
  type TypewriterSegment,
} from '../ui/TypewriterHeadline';

const HOLD_AFTER_TYPE_MS = 3200;
const TYPE_SPEED = 38;
const TYPE_START_DELAY = 220;
const SWIPE_THRESHOLD = 48;

type DisplaySlide = {
  key: string;
  image: string;
  imageMobile?: string;
  imagePosition?: string;
  overlay: 'trust' | 'appetite' | 'variety';
  tagline: string;
  titleBefore: string;
  titleAccent: string;
  titleLine2?: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta: { label: string; to: string };
  showTrustBadges: boolean;
  floatFood: boolean;
};

const OVERLAYS: DisplaySlide['overlay'][] = ['trust', 'appetite', 'variety'];

const TRUST_BADGES = [
  { icon: Star, label: '4.9 Rating', fill: true },
  { icon: MapPin, label: 'Ogijo, Ikorodu' },
  { icon: Truck, label: '30–45 mins' },
  { icon: Clock, label: '8AM–10PM' },
];

/** Open 8:00–22:00 except Friday (closed). */
function isOpenNow() {
  const now = new Date();
  if (now.getDay() === 5) return false; // Friday
  const hour = now.getHours();
  return hour >= 8 && hour < 22;
}

/** Map admin-managed slides into the homepage story presentation. */
function toDisplaySlide(slide: HeroSlide, index: number): DisplaySlide {
  const image = normalizeHeroImage(slide.image);
  const title = slide.title.trim();
  const highlight = (slide.highlight ?? '').trim();

  return {
    key: `slide-${index}-${image}`,
    image,
    imageMobile: heroMobileSrc(image),
    imagePosition: slide.imagePosition,
    overlay: OVERLAYS[index % OVERLAYS.length],
    tagline: slide.tagline.trim(),
    titleBefore: title,
    titleAccent: '',
    titleLine2: highlight || undefined,
    description: slide.description,
    primaryCta: slide.primaryCta,
    secondaryCta: slide.secondaryCta,
    showTrustBadges: index === 0,
    floatFood: index === 1,
  };
}

function segmentsForSlide(slide: DisplaySlide): TypewriterSegment[] {
  const segments: TypewriterSegment[] = [];
  if (slide.titleBefore) segments.push({ text: slide.titleBefore });
  if (slide.titleAccent) segments.push({ text: slide.titleAccent, accent: true });
  if (slide.titleLine2) {
    segments.push({
      text: slide.titleLine2,
      breakBefore: true,
      accent: true,
    });
  }
  return segments;
}

function activeHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  const active = slides.filter((s) => s.active !== false && s.image.trim());
  return active.length > 0 ? active : DEFAULT_SITE_CONTENT.heroSlides;
}

export function HeroCarousel() {
  const content = useSiteContentData();
  const slides = useMemo(
    () => activeHeroSlides(content.heroSlides).map(toDisplaySlide),
    [content.heroSlides],
  );
  const count = slides.length;
  const [current, setCurrent] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const open = isOpenNow();
  const currentRef = useRef(0);
  currentRef.current = current;
  const [holdForSlide, setHoldForSlide] = useState<number | null>(null);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    setCurrent((c) => (count === 0 ? 0 : Math.min(c, count - 1)));
  }, [count]);

  const goTo = useCallback(
    (index: number) => {
      setHoldForSlide(null);
      setTypingDone(false);
      setCurrent(((index % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => {
    setHoldForSlide(null);
    setTypingDone(false);
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setHoldForSlide(null);
    setTypingDone(false);
    setCurrent((c) => (c - 1 + count) % count);
  }, [count]);

  const onTypingComplete = useCallback(() => {
    setTypingDone(true);
    setHoldForSlide(currentRef.current);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!typingDone || holdForSlide !== current || reduceMotion || count < 2) return;
    const timer = window.setTimeout(() => next(), HOLD_AFTER_TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [typingDone, holdForSlide, current, next, reduceMotion, count]);

  useEffect(() => {
    const el = sectionRef.current;
    const layer = parallaxRef.current;
    if (!el || !layer || reduceMotion) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
        layer.style.transform = `translate3d(0, ${progress * 36}px, 0) scale(1.04)`;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reduceMotion]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) next();
    else prev();
  };

  const slide = slides[current] ?? slides[0];
  if (!slide) return null;

  return (
    <section
      ref={sectionRef}
      className="hero-story relative flex w-full items-center overflow-hidden bg-brand-dark"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Ay Food Palace story"
      tabIndex={0}
    >
      <div
        ref={parallaxRef}
        className="hero-parallax-layer absolute inset-[-4%] will-change-transform"
        style={{ transform: 'translate3d(0,0,0) scale(1.04)' }}
      >
        {slides.map((s, index) => {
          const active = index === current;
          return (
            <div
              key={s.key}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-in-out',
                active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden={!active}
            >
              <picture>
                {s.imageMobile ? (
                  <source
                    media="(max-width: 768px)"
                    srcSet={s.imageMobile}
                    type="image/webp"
                  />
                ) : null}
                <img
                  src={s.image}
                  alt=""
                  width={1600}
                  height={1067}
                  className={cn(
                    'absolute inset-0 h-full w-full max-w-none object-cover',
                    active && !reduceMotion && !s.floatFood && 'hero-ken-burns',
                    s.floatFood && active && !reduceMotion && 'hero-float-food',
                  )}
                  style={{ objectPosition: s.imagePosition ?? 'center' }}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </picture>

              <div
                className={cn(
                  'absolute inset-0',
                  s.overlay === 'trust' && 'hero-overlay-trust',
                  s.overlay === 'appetite' && 'hero-overlay-appetite',
                  s.overlay === 'variety' && 'hero-overlay-variety',
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
            </div>
          );
        })}
      </div>

      <div className="site-container relative z-10 w-full pb-28 pt-28 sm:pb-24 sm:pt-32">
        <div key={slide.key} className="hero-copy max-w-[600px]">
          {slide.showTrustBadges ? (
            <div className="hero-copy-item mb-5 flex flex-wrap items-center gap-2">
              {open ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/20 px-3 py-1.5 text-xs font-semibold text-[#B8D96A]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
                  Open Now
                </span>
              ) : null}
              {TRUST_BADGES.map(({ icon: Icon, label, fill }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm"
                >
                  <Icon
                    size={12}
                    className={cn('text-brand-gold', fill && 'fill-brand-gold')}
                  />
                  {label}
                </span>
              ))}
            </div>
          ) : slide.tagline ? (
            <p className="hero-copy-item mb-4 text-sm font-medium uppercase tracking-[0.22em] text-brand-gold/90">
              {slide.tagline}
            </p>
          ) : null}

          <div className="hero-copy-item mb-5 min-h-[2.6em] sm:min-h-[2.4em]">
            <TypewriterHeadline
              key={`type-${slide.key}-${current}`}
              segments={segmentsForSlide(slide)}
              speed={TYPE_SPEED}
              startDelay={TYPE_START_DELAY}
              onComplete={onTypingComplete}
              className="font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem]"
            />
          </div>

          <p className="hero-copy-item mb-9 max-w-xl font-sans text-base leading-relaxed text-white/80 sm:text-lg">
            {slide.description}
          </p>

          <div className="hero-copy-ctas flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link to={slide.primaryCta.to} className="hero-btn-primary">
              {slide.primaryCta.label} <ArrowRight size={18} />
            </Link>
            <Link to={slide.secondaryCta.to} className="hero-btn-secondary">
              {slide.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 sm:bottom-8 sm:gap-4">
        <button
          type="button"
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:border-brand-gold/50 hover:bg-brand-gold/20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
          {slides.map((s, index) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => goTo(index)}
              className={cn(
                'relative h-2 overflow-hidden rounded-full transition-all duration-300',
                index === current
                  ? 'w-8 bg-white/25 sm:w-10'
                  : 'w-2 bg-white/40 hover:bg-white/70',
              )}
              aria-label={`Go to slide ${index + 1}`}
            >
              {index === current && typingDone && !reduceMotion ? (
                <span
                  key={`progress-${current}-${holdForSlide}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-gold"
                  style={{
                    animation: `hero-progress ${HOLD_AFTER_TYPE_MS}ms linear forwards`,
                  }}
                />
              ) : index === current && typingDone ? (
                <span className="absolute inset-0 rounded-full bg-brand-gold" />
              ) : index === current ? (
                <span className="absolute inset-0 w-1/5 rounded-full bg-brand-gold/70" />
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:border-brand-gold/50 hover:bg-brand-gold/20"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
