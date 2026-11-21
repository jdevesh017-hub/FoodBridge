import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive & Mobile Compatibility Audit', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('Requirement 10: index.html must configure a responsive viewport meta tag', () => {
    const htmlPath = path.join(rootDir, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    expect(htmlContent).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  });

  it('Requirement 7: index.css provides .no-scrollbar touch utility', () => {
    const cssPath = path.join(rootDir, 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('.no-scrollbar');
    expect(cssContent).toContain('-webkit-overflow-scrolling: touch');
  });

  it('Requirement 1 & 2: Navbar contains mobile responsive hamburger drawer and touch targets', () => {
    const navbarPath = path.join(rootDir, 'src/components/common/Navbar.tsx');
    const content = fs.readFileSync(navbarPath, 'utf-8');
    expect(content).toContain('md:hidden');
    expect(content).toContain('min-w-[44px]');
    expect(content).toContain('min-h-[44px]');
  });

  it('Requirement 1, 3, 4: DonorDashboard provides responsive tab bar, split table/mobile card view, and touch targets', () => {
    const donorPath = path.join(rootDir, 'src/components/donor/DonorDashboard.tsx');
    const content = fs.readFileSync(donorPath, 'utf-8');
    // Mobile card view for active listings
    expect(content).toContain('hidden md:block overflow-x-auto');
    expect(content).toContain('block md:hidden divide-y');
    // History subfilters scroll horizontally
    expect(content).toContain('no-scrollbar');
    // Touch targets
    expect(content).toContain('min-h-[38px]');
  });

  it('Requirement 1, 3, 6: NgoDashboard provides responsive map/list switcher for mobile viewports and touch sign-off', () => {
    const ngoPath = path.join(rootDir, 'src/components/ngo/NgoDashboard.tsx');
    const content = fs.readFileSync(ngoPath, 'utf-8');
    expect(content).toContain('mobileDiscoverView');
    expect(content).toContain('List View');
    expect(content).toContain('Map View');
    expect(content).toContain('min-h-[44px]');
  });

  it('Requirement 1, 3, 6: VolunteerDashboard provides responsive tasks/map switcher and mobile-adapted stepper', () => {
    const volPath = path.join(rootDir, 'src/components/volunteer/VolunteerDashboard.tsx');
    const content = fs.readFileSync(volPath, 'utf-8');
    expect(content).toContain('mobileAvailableView');
    expect(content).toContain('grid-cols-2 sm:grid-cols-4');
    expect(content).toContain('min-h-[44px]');
  });

  it('Requirement 8: AccessibleModal provides responsive backdrop padding for 320px screens', () => {
    const modalPath = path.join(rootDir, 'src/components/common/AccessibleModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('p-2 sm:p-4');
  });

  it('Requirement 9: Form inputs in modals avoid iOS zoom by sizing at 16px (text-base) on mobile', () => {
    const authPath = path.join(rootDir, 'src/components/auth/AuthModal.tsx');
    const authContent = fs.readFileSync(authPath, 'utf-8');
    expect(authContent).toContain('text-base sm:text-');

    const donorPath = path.join(rootDir, 'src/components/donor/DonorDashboard.tsx');
    const donorContent = fs.readFileSync(donorPath, 'utf-8');
    expect(donorContent).toContain('text-base sm:text-');

    const ngoPath = path.join(rootDir, 'src/components/ngo/NgoDashboard.tsx');
    const ngoContent = fs.readFileSync(ngoPath, 'utf-8');
    expect(ngoContent).toContain('text-base sm:text-');
  });
});
