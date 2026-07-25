import { useState, useEffect } from 'react';
import {
  DEFAULT_FOOD_IMAGE,
  optimizeUnsplashUrl,
  unsplashBlurUrl,
  unsplashSrcSet,
} from '../../utils/food-images';
import { cn } from '../../utils/helpers';

interface FoodImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Eager for above-the-fold cards (first few on home). */
  priority?: boolean;
  /** Responsive sizes hint — defaults to food-grid card width. */
  sizes?: string;
}

export function FoodImage({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px',
}: FoodImageProps) {
  const raw = src || DEFAULT_FOOD_IMAGE;
  const optimized = optimizeUnsplashUrl(raw, 'card');
  const [imgSrc, setImgSrc] = useState(optimized);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(optimizeUnsplashUrl(src || DEFAULT_FOOD_IMAGE, 'card'));
    setLoaded(false);
  }, [src]);

  const srcSet = unsplashSrcSet(imgSrc);
  const blur = unsplashBlurUrl(imgSrc);

  return (
    <img
      src={imgSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={480}
      height={360}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(
        'object-cover transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-80',
        className
      )}
      style={
        blur && !loaded
          ? {
              backgroundImage: `url(${blur})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      onLoad={() => setLoaded(true)}
      onError={() => {
        setImgSrc(optimizeUnsplashUrl(DEFAULT_FOOD_IMAGE, 'card'));
        setLoaded(true);
      }}
    />
  );
}
