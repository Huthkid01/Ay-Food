import { useState, useEffect } from 'react';
import { DEFAULT_FOOD_IMAGE } from '../../utils/food-images';
import { cn } from '../../utils/helpers';

interface FoodImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className }: FoodImageProps) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_FOOD_IMAGE);

  useEffect(() => {
    setImgSrc(src || DEFAULT_FOOD_IMAGE);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn('object-cover', className)}
      onError={() => setImgSrc(DEFAULT_FOOD_IMAGE)}
    />
  );
}
