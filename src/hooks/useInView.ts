import { useEffect, useRef, useState, RefObject } from 'react';

export interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * useInView Hook
 * Uses native browser IntersectionObserver to detect when an element enters the viewport.
 * Automatically respects prefers-reduced-motion by returning true immediately.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T | null>(null);

  // If in an environment without IntersectionObserver or reduced-motion is requested, default to true
  const initialValue = () => {
    if (typeof window === 'undefined') return true;
    if (!('IntersectionObserver' in window)) return true;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  };

  const [isInView, setIsInView] = useState<boolean>(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    // Check if user requested reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setIsInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    // If already in view and triggerOnce is active, no need to observe again
    if (isInView && triggerOnce) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(entry.target);
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, isInView]);

  return [ref, isInView];
}
