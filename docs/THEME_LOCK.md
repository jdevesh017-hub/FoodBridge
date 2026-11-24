# FoodBridge Design System Theme Lock (Snapshot)

> **LOCKED BY POLICY**: This document defines the exact theme invariants for FoodBridge.
> Under no circumstances may color tokens, font families, base styles, or typography hierarchies be modified, replaced, or expanded without explicit user authorization.

---

## 1. Color Palette Tokens (`src/index.css`)

All colors in FoodBridge are grounded in organic, human-centered tones representing sustainability, food rescue, warmth, and dignity. They are defined as CSS custom properties in `:root`:

| Token | Hex Value | Semantic Role in UI |
| :--- | :--- | :--- |
| `--brand-forest` | `#183D2B` | Primary brand tone; hero text, primary buttons, dark badges, selection background |
| `--brand-olive` | `#647C50` | Secondary botanical tone; sub-headings, subtle borders, accent icons, active pills |
| `--brand-ivory` | `#F7F6F0` | Primary canvas background; warm paper-like tone throughout body and modals |
| `--brand-sage` | `#E8EDE2` | Soft surface tint; card fills, secondary buttons, subtle dividers, pill backdrops |
| `--brand-charcoal`| `#252923` | Primary body typography; high-contrast readable prose, dark borders |
| `--brand-terracotta`| `#C77A54` | Warm accent; alert highlights, callouts, warning states, secondary CTAs |
| `--brand-white` | `#FFFFFF` | Card foreground, elevated modal surfaces, clean contrast containers |

---

## 2. Typography Hierarchy & Font Families

The typography pairs an editorial serif with a geometric sans-serif:

| Style Category | Font Stack | Target Selectors |
| :--- | :--- | :--- |
| **Body & UI Sans** | `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | `body`, inputs, buttons, tables, Leaflet map containers |
| **Editorial Serif** | `'Playfair Display', Georgia, serif` | `h1`, `h2`, `h3`, `.font-editorial` |

- Google Fonts links in `index.html`:
  - `Playfair Display:ital,wght@0,400..700;1,400..700`
  - `Plus Jakarta Sans:wght@300;400;500;600;700`

---

## 3. Base Styles & Body Configuration

Defined under `@layer base` in `src/index.css`:

```css
body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #252923;
  background-color: #F7F6F0;
  overflow-x: hidden;
}
```

Text selection configuration in `index.html`:
- Background: `selection:bg-[#183D2B]`
- Foreground: `selection:text-[#F7F6F0]`

---

## 4. Key Border Radii

FoodBridge components adhere strictly to rounded, approachable radii:

- `rounded-xs` (`2px` / `0.125rem`): Micro indicators and subtle badges
- `rounded-lg` (`8px` / `0.5rem`): Form inputs, dropdown selectors, Leaflet map container (`border-radius: 0.5rem`)
- `rounded-xl` (`12px` / `0.75rem`): Dashboard cards, action panels, toast alerts
- `rounded-2xl` (`16px` / `1rem`): Hero panels, large modal dialogs (`AccessibleModal`)
- `rounded-full` (`9999px`): Status badges (`StatusBadge`), role switches, circular icon actions

---

## 5. Spacing Scale & Layout Constraints

- **Max Content Width**: `max-w-7xl` (`80rem` / `1280px`)
- **Responsive Horizontal Gutters**: `px-4 sm:px-6 lg:px-8`
- **Section Spacing**: `space-y-12 sm:space-y-16 lg:space-y-24`
- **Touch Target Minimum**: At least `44px` height/width (`min-h-[44px] min-w-[44px]`) on interactive elements

---

## 6. Touch & Utility Rules

- `.no-scrollbar`: Touch-friendly scrolling without intrusive desktop scrollbars:
  - `-ms-overflow-style: none;`
  - `scrollbar-width: none;`
  - `-webkit-overflow-scrolling: touch;`
- Leaflet map container:
  - Font family override: `'Plus Jakarta Sans', sans-serif !important`
  - Border radius: `0.5rem`
  - z-index: `10`

---

## 7. Automated Theme Lock Invariant

The test `src/__tests__/themeLock.test.ts` executes in Vitest on every build and CI cycle, verifying that `src/index.css` contains all 7 color variables and both font family declarations with zero drift.
