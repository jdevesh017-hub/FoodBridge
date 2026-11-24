import React, { useEffect, useState } from 'react';
import { useInView } from '../../../hooks/useInView';

export interface CountUpProps {
  end: number;
  start?: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Pure formatting function: rounds to specified decimals and formats with locale separators
 */
export function formatCountNumber(val: number, decimals: number = 0): string {
  if (isNaN(val)) return '0';
  if (decimals <= 0) {
    return Math.round(val).toLocaleString('en-US');
  }
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * <CountUp> Motion Component
 * Smoothly animates from a start value to an end value when entering the viewport.
 * Honors prefers-reduced-motion by rendering the final value immediately with zero delay.
 */
export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  durationMs = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [ref, isInView] = useInView<HTMLSpanElement>({ threshold: 0.1, triggerOnce: true });

  // Check if reduced motion is requested
  const isReducedMotion = () => {
    if (typeof window === 'undefined') return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  };

  const [currentValue, setCurrentValue] = useState<number>(() => {
    return isReducedMotion() ? end : start;
  });

  useEffect(() => {
    if (isReducedMotion()) {
      setCurrentValue(end);
      return;
    }

    if (!isInView) return;

    let animId: number;
    let startTime: number | null = null;
    const change = end - start;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic: fast start, soft and gentle landing
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const nextVal = start + change * easeOut;

      setCurrentValue(nextVal);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurrentValue(end);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isInView, end, start, durationMs]);

  const formattedValue = formatCountNumber(currentValue, decimals);
  const fullText = `${prefix}${formattedValue}${suffix}`;

  return (
    <span
      ref={ref}
      className={className}
      aria-label={`${prefix}${formatCountNumber(end, decimals)}${suffix}`}
    >
      {fullText}
    </span>
  );
};
