import { useSiteContentData } from '../../hooks/useSiteContent';
import { cn } from '../../utils/helpers';

const LOGO_FULL = '/assets/ay-food-palace-logo.svg';
const LOGO_MARK = '/assets/ay-food-palace-logo-mark.svg';

type BrandLogoProps = {
  className?: string;
  /** Icon / wordmark size */
  size?: 'sm' | 'md' | 'lg';
  /** Show wordmark next to the icon (full SVG on dark; mark + text on light) */
  showWordmark?: boolean;
  /** Light page (dark text) vs dark page (white text) */
  tone?: 'light' | 'dark';
  wordmarkClassName?: string;
};

const sizeMap = {
  sm: { mark: 'h-9 w-9', full: 'h-9 sm:h-10', word: 'text-lg' },
  md: { mark: 'h-11 w-11', full: 'h-11 sm:h-12', word: 'text-xl lg:text-2xl' },
  lg: { mark: 'h-14 w-14', full: 'h-12 sm:h-14', word: 'text-3xl' },
};

/** Ay Food Palace logo — orange fork/knife mark + wordmark. */
export function BrandLogo({
  className,
  size = 'md',
  showWordmark = true,
  tone = 'dark',
  wordmarkClassName,
}: BrandLogoProps) {
  const { restaurant } = useSiteContentData();
  const s = sizeMap[size];
  const alt = `${restaurant.brandPrefix} ${restaurant.brandAccent} Palace`;

  // Dark surfaces: use the full SVG (white + orange wordmark reads clearly)
  if (showWordmark && tone === 'dark') {
    return (
      <img
        src={LOGO_FULL}
        alt={alt}
        className={cn('w-auto max-w-[min(100%,13.5rem)] object-contain object-left', s.full, className)}
        decoding="async"
      />
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src={LOGO_MARK}
        alt={showWordmark ? '' : alt}
        className={cn('shrink-0 object-contain', s.mark)}
        decoding="async"
        aria-hidden={showWordmark ? true : undefined}
      />
      {showWordmark ? (
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            s.word,
            tone === 'dark' ? 'text-white' : 'text-gray-900',
            wordmarkClassName,
          )}
        >
          {restaurant.brandPrefix}{' '}
          <span className="text-brand-gold">{restaurant.brandAccent}</span>
        </span>
      ) : null}
    </span>
  );
}
