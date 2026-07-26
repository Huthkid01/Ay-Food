import { useEffect, useState } from 'react';
import { cn } from '../../utils/helpers';

type Props = {
  title: string;
  highlight?: string;
  className?: string;
  /** ms per character */
  speed?: number;
  /** delay before typing starts */
  startDelay?: number;
  /** Fired once when typing finishes (or immediately if reduced motion) */
  onComplete?: () => void;
};

/**
 * Typewriter (typing) effect for hero headlines.
 * Re-runs when title/highlight change (carousel slides).
 */
export function TypewriterHeadline({
  title,
  highlight,
  className,
  speed = 40,
  startDelay = 250,
  onComplete,
}: Props) {
  const whitePart = title.trimEnd();
  const orangePart = (highlight ?? '').trim();
  const total = whitePart.length + orangePart.length;
  const fullLabel = orangePart ? `${whitePart} ${orangePart}` : whitePart;

  const [count, setCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      onComplete?.();
    };

    if (reduceMotion || total === 0) {
      setCount(total);
      finish();
      return;
    }

    setCount(0);
    let i = 0;
    let intervalId = 0;
    const startId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= total) {
          window.clearInterval(intervalId);
          finish();
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, [whitePart, orangePart, total, speed, startDelay, reduceMotion, onComplete]);

  const whiteTyped = whitePart.slice(0, Math.min(count, whitePart.length));
  const orangeTyped =
    count > whitePart.length
      ? orangePart.slice(0, count - whitePart.length)
      : '';
  const showOrangeBlock = Boolean(orangePart) && count > whitePart.length;
  const done = count >= total;

  return (
    <h1 className={cn(className)} aria-label={fullLabel}>
      <span aria-hidden="true">
        {whiteTyped}
        {showOrangeBlock ? (
          <>
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="text-brand-gold">{orangeTyped}</span>
          </>
        ) : null}
        {!reduceMotion ? (
          <span
            className={cn(
              'ml-1 inline font-semibold tracking-widest text-brand-gold',
              done && 'animate-pulse',
            )}
            aria-hidden
          >
            ...
          </span>
        ) : null}
      </span>
    </h1>
  );
}
