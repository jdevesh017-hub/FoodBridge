import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Theme Lock: Invariant Enforcement', () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const cssPath = path.join(rootDir, 'src', 'index.css');
  const htmlPath = path.join(rootDir, 'index.html');
  const lockDocPath = path.join(rootDir, 'docs', 'THEME_LOCK.md');

  it('THEME_LOCK.md exists and documents the design system invariants', () => {
    expect(fs.existsSync(lockDocPath)).toBe(true);
    const doc = fs.readFileSync(lockDocPath, 'utf-8');
    expect(doc).toContain('--brand-forest');
    expect(doc).toContain('--brand-olive');
    expect(doc).toContain('--brand-ivory');
    expect(doc).toContain('--brand-sage');
    expect(doc).toContain('--brand-charcoal');
    expect(doc).toContain('--brand-terracotta');
    expect(doc).toContain('--brand-white');
    expect(doc).toContain('Plus Jakarta Sans');
    expect(doc).toContain('Playfair Display');
  });

  it('src/index.css defines exact brand color tokens in :root', () => {
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Strict assertions on the 7 brand tokens
    expect(css).toMatch(/--brand-forest:\s*#183D2B;/i);
    expect(css).toMatch(/--brand-olive:\s*#647C50;/i);
    expect(css).toMatch(/--brand-ivory:\s*#F7F6F0;/i);
    expect(css).toMatch(/--brand-sage:\s*#E8EDE2;/i);
    expect(css).toMatch(/--brand-charcoal:\s*#252923;/i);
    expect(css).toMatch(/--brand-terracotta:\s*#C77A54;/i);
    expect(css).toMatch(/--brand-white:\s*#FFFFFF;/i);
  });

  it('src/index.css asserts exact font families for body and editorial headings', () => {
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Body font stack assertion
    expect(css).toContain(
      "font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
    );

    // Editorial font stack assertion
    expect(css).toContain("font-family: 'Playfair Display', Georgia, serif;");
  });

  it('src/index.css maintains body canvas colors and leaflet radius', () => {
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toMatch(/color:\s*#252923;/i);
    expect(css).toMatch(/background-color:\s*#F7F6F0;/i);
    expect(css).toMatch(/overflow-x:\s*hidden;/i);
    expect(css).toContain('border-radius: 0.5rem;');
  });

  it('index.html links Google Fonts for Playfair Display and Plus Jakarta Sans', () => {
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('family=Playfair+Display');
    expect(html).toContain('family=Plus+Jakarta+Sans');
    expect(html).toContain('selection:bg-[#183D2B]');
    expect(html).toContain('selection:text-[#F7F6F0]');
  });
});
