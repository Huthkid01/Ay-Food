import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/helpers';

export type TypewriterSegment = {
  text: string;
  /** Orange brand accent */
  accent?: boolean;
  /** Start this segment on a new line */
  breakBefore?: boolean;
};

type Props = {
  segments: TypewriterSegment[];
  className?: string;
  /** ms per character */
  speed?: number;
  /** delay before typing starts */
  startDelay?: number;
  /** Fired once when typing finishes (or immediately if reduced motion) */
  onComplete?: () => void;
};

/**
 * Typewriter effect for hero headlines (supports multi-line + orange accents).
 */
export function TypewriterHeadline({
  segments,
  className,
  speed = 38,
  startDelay = 200,
  onComplete,
}: Props) {
  const parts = useMemo(
    () =>
      segments
        .map((s) => ({ ...s, text: s.text }))
        .filter((s) => s.text.length > 0),
    [segments],
  );

  const total = useMemo(
    () => parts.reduce((sum, s) => sum + s.text.length, 0),
    [parts],
  );

  const fullLabel = useMemo(
    () =>
      parts
        .map((s) => s.text)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    [parts],
  );

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
  }, [total, speed, startDelay, reduceMotion, onComplete, fullLabel]);

  let remaining = count;
  const rendered = parts.map((part, index) => {
    const take = Math.max(0, Math.min(part.text.length, remaining));
    remaining -= take;
    const typed = part.text.slice(0, take);
    if (!typed) return null;
    return (
      <span key={index}>
        {part.breakBefore ? <br /> : null}
        <span className={part.accent ? 'text-brand-gold' : undefined}>{typed}</span>
      </span>
    );
  });

  const done = count >= total;

  return (
    <h1 className={cn(className)} aria-label={fullLabel}>
      <span aria-hidden="true">
        {rendered}
        {!reduceMotion ? (
          <span
            className={cn(
              'ml-0.5 inline font-semibold text-brand-gold',
              done && 'animate-pulse',
            )}
          >
            .
          </span>
        ) : null}
      </span>
    </h1>
  );
}
