import { UtensilsCrossed } from 'lucide-react';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { cn } from '../../utils/helpers';

type BrandLogoProps = {
  className?: string;
  /** Icon box size */
  size?: 'sm' | 'md' | 'lg';
  /** Show wordmark next to the icon */
  showWordmark?: boolean;
  /** Light page (dark text) vs dark page (white text) */
  tone?: 'light' | 'dark';
  wordmarkClassName?: string;
};

const sizeMap = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
};

/** Orange utensils mark used across storefront + admin (login, sidebar, favicon). */
export function BrandLogo({
  className,
  size = 'md',
  showWordmark = true,
  tone = 'dark',
  wordmarkClassName,
}: BrandLogoProps) {
  const { restaurant } = useSiteContentData();
  const s = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-brand-gold text-white',
          s.box,
        )}
        aria-hidden
      >
        <UtensilsCrossed className={s.icon} />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            size === 'sm' && 'text-lg',
            size === 'md' && 'text-xl lg:text-2xl',
            size === 'lg' && 'text-3xl',
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
