import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';
import {
  DEFAULT_FOOD_IMAGE,
  optimizeUnsplashUrl,
} from '../../utils/food-images';

type Props = {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

/** Full-screen food image viewer for menu taps. */
export function FoodImageLightbox({ src, alt, open, onClose }: Props) {
  const fullSrc = optimizeUnsplashUrl(src || DEFAULT_FOOD_IMAGE, 'large');

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — full image`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        aria-label="Close image"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-1 right-0 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition hover:border-brand-gold/50 hover:bg-brand-gold/20 sm:-right-2 sm:-top-2"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <img
          src={fullSrc}
          alt={alt}
          className="max-h-[min(78vh,720px)] w-full rounded-2xl object-contain shadow-[0_24px_80px_rgb(0_0_0/0.55)]"
          decoding="async"
        />
        <p className="mt-4 max-w-full truncate px-2 text-center text-sm font-medium text-white/90 sm:text-base">
          {alt}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function FoodImageZoomHint() {
  return (
    <span className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
      <ZoomIn size={14} aria-hidden />
    </span>
  );
}
