import React from 'react';
import { useInView } from '../../../hooks/useInView';

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  as?: 'div' | 'section' | 'article' | 'header' | 'aside';
}

/**
 * <Reveal> Wrapper Component
 * Applies a tasteful, single fade-up scroll reveal when entering the viewport.
 * If the user has prefers-reduced-motion enabled, children render statically with zero motion delay.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  durationMs = 450,
  as: Component = 'div',
}) => {
  const [ref, isInView] = useInView<HTMLDivElement>({ threshold: 0.1, triggerOnce: true });

  const style: React.CSSProperties = {
    transitionProperty: 'opacity, transform',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${delayMs}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <Component
      ref={ref as any}
      style={style}
      className={`${className} ${
        isInView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {children}
    </Component>
  );
};
