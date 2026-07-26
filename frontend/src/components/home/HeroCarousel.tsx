import { useState, useEffect, useCallback, useRef } from 'react';
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
import { buildUnsplashUrl } from '../../utils/food-images';
import { cn } from '../../utils/helpers';
import {
  TypewriterHeadline,
  type TypewriterSegment,
} from '../ui/TypewriterHeadline';

const HOLD_AFTER_TYPE_MS = 3200;
const TYPE_SPEED = 38;
const TYPE_START_DELAY = 220;
const SWIPE_THRESHOLD = 48;

type StorySlide = {
  id: 'restaurant' | 'signature' | 'variety';
  image: string;
  imageMobile?: string;
  imagePosition?: string;
  overlay: 'trust' | 'appetite' | 'variety';
  /** Words before the orange accent */
  titleBefore: string;
  /** Orange accent word(s) */
  titleAccent: string;
  /** Optional line after accent (same heading) */
  titleAfter?: string;
  /** Second heading line (serif) */
  titleLine2?: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta: { label: string; to: string };
  showTrustBadges?: boolean;
  floatFood?: boolean;
  collage?: boolean;
};

const VARIETY_TILES = [
  { src: buildUnsplashUrl('1664992960082-0ea299a9c53e', 'large'), label: 'Jollof' },
  { src: buildUnsplashUrl('1604329760661-e71dc83f8f26', 'large'), label: 'Amala' },
  { src: buildUnsplashUrl('1763048443535-1243379234e2', 'large'), label: 'Egusi' },
  { src: buildUnsplashUrl('1532550907401-a500c9a57435', 'large'), label: 'Chicken' },
  { src: buildUnsplashUrl('1664334997177-6ae654a62735', 'large'), label: 'Beans' },
  { src: buildUnsplashUrl('1603496987674-79600a000f55', 'large'), label: 'Fried Rice' },
  { src: buildUnsplashUrl('1665401015549-712c0dc5ef85', 'large'), label: 'Seafood' },
  { src: buildUnsplashUrl('1665332561290-cc6757172890', 'large'), label: 'Soup' },
];

/** Fixed conversion story — order must never change. */
const STORY_SLIDES: StorySlide[] = [
  {
    id: 'restaurant',
    image: '/assets/hero-restaurant.webp',
    imageMobile: '/assets/hero-restaurant-768.webp',
    imagePosition: 'center 30%',
    overlay: 'trust',
    titleBefore: 'Authentic ',
    titleAccent: 'Nigerian',
    titleAfter: ' Dining',
    titleLine2: 'in Ogijo',
    description:
      'Visit our beautiful restaurant or order fresh Nigerian meals online for fast delivery and pickup.',
    primaryCta: { label: 'Order Now', to: '/menu' },
    secondaryCta: { label: 'Browse Menu', to: '/menu' },
    showTrustBadges: true,
  },
  {
    id: 'signature',
    image: '/assets/hero-signature.webp',
    imageMobile: '/assets/hero-signature-768.webp',
    imagePosition: 'center',
    overlay: 'appetite',
    titleBefore: 'Freshly Cooked.',
    titleAccent: '',
    titleLine2: 'Delivered Hot.',
    description:
      'Every meal is prepared fresh using quality ingredients and authentic Nigerian recipes.',
    primaryCta: { label: 'Order Now', to: '/menu' },
    secondaryCta: { label: 'Build Your Pack', to: '/build' },
    floatFood: true,
  },
  {
    id: 'variety',
    image: '/assets/hero-variety-alt.webp',
    imagePosition: 'center',
    overlay: 'variety',
    titleBefore: 'Something ',
    titleAccent: 'Delicious',
    titleLine2: 'For Everyone',
    description:
      'Browse our full menu and discover authentic Nigerian meals made fresh every day.',
    primaryCta: { label: 'Explore Menu', to: '/menu' },
    secondaryCta: { label: 'Order Now', to: '/menu' },
    collage: true,
  },
];

const TRUST_BADGES = [
  { icon: Star, label: '4.9 Rating', fill: true },
  { icon: MapPin, label: 'Ogijo, Ikorodu' },
  { icon: Truck, label: '30–45 mins' },
  { icon: Clock, label: 'Open Daily' },
];

function isOpenNow() {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 22;
}

function segmentsForSlide(slide: StorySlide): TypewriterSegment[] {
  const segments: TypewriterSegment[] = [];
  if (slide.titleBefore) segments.push({ text: slide.titleBefore });
  if (slide.titleAccent) segments.push({ text: slide.titleAccent, accent: true });
  if (slide.titleAfter) segments.push({ text: slide.titleAfter });
  if (slide.titleLine2) {
    segments.push({
      text: slide.titleLine2,
      breakBefore: true,
      accent: slide.id === 'signature',
    });
  }
  return segments;
}

function VarietyCollage({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 grid grid-cols-2 grid-rows-4 gap-1 p-1 sm:grid-cols-4 sm:grid-rows-2 sm:gap-1.5 sm:p-1.5',
        active && 'hero-ken-burns',
      )}
      aria-hidden
    >
      {VARIETY_TILES.map((tile) => (
        <div key={tile.label} className="relative min-h-0 overflow-hidden">
          <img
            src={tile.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function HeroCarousel() {
  const slides = STORY_SLIDES;
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

  /** Advance after typing finishes (+ hold so the line can be read) */
  useEffect(() => {
    if (holdForSlide === null) return;
    if (holdForSlide !== current) {
      setHoldForSlide(null);
      return;
    }
    if (reduceMotion || count <= 1) return;
    const timer = window.setTimeout(() => next(), HOLD_AFTER_TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [holdForSlide, current, reduceMotion, count, next]);

  /** Keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  /** Warm next slide */
  useEffect(() => {
    const nextSlide = slides[(current + 1) % count];
    if (!nextSlide?.image) return;
    const img = new Image();
    img.src = nextSlide.image;
    if (nextSlide.imageMobile) {
      const m = new Image();
      m.src = nextSlide.imageMobile;
    }
  }, [current, count, slides]);

  /** Desktop parallax */
  useEffect(() => {
    if (reduceMotion) return;
    const section = sectionRef.current;
    const layer = parallaxRef.current;
    if (!section || !layer) return;

    const onMove = (e: MouseEvent) => {
      if (window.matchMedia('(pointer: coarse)').matches) return;
      const rect = section.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      layer.style.transform = `translate3d(${x * -12}px, ${y * -8}px, 0) scale(1.06)`;
    };
    const onLeave = () => {
      layer.style.transform = 'translate3d(0, 0, 0) scale(1.04)';
    };

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);
    return () => {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
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

  const slide = slides[current];

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
      {/* Backgrounds */}
      <div
        ref={parallaxRef}
        className="hero-parallax-layer absolute inset-[-4%] will-change-transform"
        style={{ transform: 'translate3d(0,0,0) scale(1.04)' }}
      >
        {slides.map((s, index) => {
          const active = index === current;
          return (
            <div
              key={s.id}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-in-out',
                active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden={!active}
            >
              {s.collage ? (
                <VarietyCollage active={active && !reduceMotion} />
              ) : (
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
              )}

              {/* Spec overlay: top 55% → bottom 75% */}
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

      {/* Copy */}
      <div className="site-container relative z-10 w-full pb-28 pt-28 sm:pb-24 sm:pt-32">
        <div
          key={slide.id}
          className="hero-copy max-w-[600px]"
        >
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
          ) : (
            <p className="hero-copy-item mb-4 text-sm font-medium uppercase tracking-[0.22em] text-brand-gold/90">
              {slide.id === 'signature' ? 'Signature kitchen' : 'Full menu'}
            </p>
          )}

          <div className="hero-copy-item mb-5 min-h-[2.6em] sm:min-h-[2.4em]">
            <TypewriterHeadline
              key={`type-${slide.id}-${current}`}
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

      {/* Controls */}
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
              key={s.id}
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
              aria-label={`Go to slide ${index + 1}: ${s.id}`}
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
