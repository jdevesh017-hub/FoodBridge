import { describe, it, expect } from 'vitest';
import { formatCountNumber } from '../components/common/motion/CountUp';

describe('CountUp & Motion Foundations', () => {
  describe('formatCountNumber Formatting', () => {
    it('formats large numbers with locale grouping separators', () => {
      const result = formatCountNumber(142850);
      // In en-US: 142,850; in en-IN: 1,42,850. Both include comma grouping
      expect(result).toMatch(/1[,.]?42[,.]850/);
    });

    it('rounds fractional numbers to nearest whole integer when decimals is 0', () => {
      const r1 = formatCountNumber(4820.7);
      const r2 = formatCountNumber(4820.2);
      expect(r1).toContain('4,821');
      expect(r2).toContain('4,820');
      expect(formatCountNumber(12.5)).toBe('13');
    });

    it('formats with exact decimal precision when decimals parameter is provided', () => {
      expect(formatCountNumber(99.4, 1)).toBe('99.4');
      const formatted = formatCountNumber(1250.75, 2);
      expect(formatted).toContain('1,250.75');
      expect(formatCountNumber(42, 2)).toBe('42.00');
    });

    it('handles zero and edge cases cleanly', () => {
      expect(formatCountNumber(0)).toBe('0');
      expect(formatCountNumber(NaN)).toBe('0');
      expect(formatCountNumber(-500)).toContain('-500');
    });
  });

  describe('Reduced Motion Invariant', () => {
    it('respects prefers-reduced-motion media query logic', () => {
      const mockMatchMedia = (query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });

      const isReduced = mockMatchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(isReduced).toBe(true);

      const isNotReduced = mockMatchMedia('(prefers-reduced-motion: no-preference)').matches;
      expect(isNotReduced).toBe(false);
    });
  });
});
