# FoodBridge — Human-Centered Surplus Food Redistribution Platform

FoodBridge is a social-impact platform connecting food donors (restaurants, hotels, universities, caterers) with verified NGOs, community kitchens, and dispatch volunteers to prevent edible food waste and nourish local communities.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following final adjustments have been incorporated into the core specification:

- **1. FSSAI-Aligned Food Safety Rules**: All temperature and holding-time thresholds are calibrated to documented FSSAI Surplus Food Regulations & Codex standards:
  - Hot cooked meals: Held at $\ge 65^\circ\text{C}$ ($\ge 60^\circ\text{C}$ during transit); maximum 4-hour window if unrefrigerated.
  - Chilled / Dairy / Cooked Meat: Held at $\le 5^\circ\text{C}$; transit ambient exposure capped at 2 hours.
  - Bakery & Fresh Dry Produce: Ambient ($\le 25^\circ\text{C}$), protected from moisture and contaminants.
  - All rules are maintained in a configurable, documented safety registry (`fssaiSurplusGuidelines`) with citations, flagging any incomplete data or threshold breach. Food safety is never claimed through image models or automated approximations alone.
- **2. Prototype-Level Reservation Locking & Supabase Transaction Readiness**:
  - The local prototype uses an explicit lock leasing mechanism (`donationLocks` with timestamped leases and optimistic concurrency tokens).
  - The service layer API (`acquireReservationLock(id, ngoId)`) is modeled after atomic PostgreSQL transactions (`SELECT FOR UPDATE` / Supabase RPC functions) so switching to Supabase requires zero UI refactoring.
- **3. Demonstration Sandbox vs. Production Authentication**:
  - The top "Preview Role Switcher" is clearly designated as a prototype demonstration switcher for evaluators.
  - Actual user accounts, role registration forms, session tokens, and profile management are decoupled in `authService.ts` to support real password hashing and Supabase Auth JWTs.
- **4. Strict Ledger Separation for Real vs. Demo Impact**:
  - Records have an immutable `origin: 'curated_demo' | 'user_created'` attribute.
  - Live impact stats only count donations with `status: 'DELIVERED'` and `origin: 'user_created'`, with an explicit UI toggle to compare "Active Session Impact" and "Platform Historical Demonstration Baseline".
- **5. Volunteer Recovery & Exception Workflows**:
  - Pre-pickup cancellation instantly returns the donation to the dispatch pool with urgent priority.
  - On-site failed pickup reporting captures specific incident reasons (donor closed, safety condition breached, quantity mismatch) and triggers rerouting.
- **6. Quantity Transparency**:
  - Every batch tracks: `donor_estimated_kg`, `servings_estimate`, `measured_kg` (scale reading), and `pickup_confirmed_kg` (handover audit).

---

## 1. Overview & Core Concept

### What It Does
FoodBridge bridges the operational gap between commercial kitchen surplus and local food assistance networks. It replaces fragmented phone calls and messaging chats with a structured, dignified workflow:
1. **Donors** record surplus batches with certified FSSAI safety parameters, quantities, and pickup windows.
2. **NGOs & Community Kitchens** discover nearby safe meals on a live split-screen map and reserve needed quantities with atomic collision prevention.
3. **Volunteers** claim localized pickup runs, navigate via turn-by-turn waypoint stages, and confirm physical handover.
4. **Food Waste Intelligence Engine** tracks recurring surplus patterns across days and categories to generate actionable "Your Next Better Decision" preparation recommendations.

### Target Personas
- **The Food Donor** (Head Chef, Canteen Director, Banquet Manager): Needs frictionless surplus logging in under 90 seconds without complex multi-step wizards.
- **The NGO Coordinator** (Food Pantry Lead, Shelter Director): Needs to rapidly verify food safety, dietary categories, transit requirements, and secure reservations.
- **The Volunteer Courier** (Community Member, Student Driver): Needs clear location milestones, collection deadlines, and one-tap status updates.
- **The General Public / Partner**: Seeks transparency, authentic impact metrics, and intuitive onboarding into the network.

---

## 2. User Experience & Visual Design

### Editorial Aesthetic & Visual Reference
FoodBridge embodies a contemporary European sustainability publication: warm alabaster paper tones, deep forest green anchoring surfaces, understated terracotta accents, and documentary photography. It strictly adheres to anti-slop guidelines: no purple gradients, no glassmorphism, no fake execution tags, and zero static pill badges.

### Brand Color Tokens
- **Canvas / Ground**: Warm Ivory (`#F7F6F0`) and Crisp White (`#FFFFFF`)
- **Primary Brand**: Deep Forest Green (`#183D2B`)
- **Secondary Natural Tone**: Muted Olive / Pale Sage (`#647C50`, `#E8EDE2`)
- **Typography & Structure**: Charcoal (`#252923`) and Whisper Stone Dividers (`#E2DFD2`)
- **Accent**: Muted Terracotta (`#C77A54`), reserved exclusively for primary action highlights, status urgency, and safety attention flags.

### Typography System
- **Headlines & Editorial Marks**: Playfair Display / DM Serif Display with balanced line breaks and refined italic treatments.
- **Body & Controls**: Plus Jakarta Sans / Manrope (clean, humanist, readable at all sizes).
- **Metrics & Telemetry**: Tabular figures (`tabular-nums`) with monospace alignment for weights (kg), meal counts, and countdown timers.
- **Metadata**: Quiet inline text separated by typographic middots (`·`) rather than boxed pills.

---

## 3. System Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FoodBridge App Root                             │
│       (Role Context, Global Flash Notifications, Route View Controller)     │
└──────┬──────────────────────┬───────────────────────┬───────────────────────┘
       │                      │                       │
       ▼                      ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Landing Page │       │ Auth / Roles │       │ Role Switch  │
│  & Story     │       │ Registration │       │ Sandbox Bar  │
└──────┬───────┘       └──────────────┘       └──────┬───────┘
       │                                             │
       ├─────────────────────────────────────────────┴─────────────────────┐
       ▼                               ▼                                   ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│     DONOR PORTAL      │   │      NGO PORTAL       │   │   VOLUNTEER PORTAL    │
│  • Surplus Overview   │   │  • Split Map & List   │   │  • Task Dispatch Map  │
│  • Direct 1-Page Log  │   │  • Atomic Reservation │   │  • Multi-stage Pickup │
│  • 4-Tier Quantities  │   │  • Dietary Filters    │   │  • Cancel / Reopen    │
│  • FSSAI Safety Audit │   │  • Delivery Tracking  │   │  • Handover Proof     │
└──────────┬────────────┘   └───────────┬───────────┘   └───────────┬───────────┘
           │                            │                           │
           └────────────────────────────┼───────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Decoupled Service Layer (`/src/services`)              │
│  • `donationService.ts` (Atomic Locking, State Transitions, Leases)         │
│  • `volunteerService.ts` (Dispatch, Cancel, Failed Pickup, Reassignment)    │
│  • `foodSafetyService.ts` (FSSAI Rule Registry, Compliance Flags)           │
│  • `impactService.ts` (Verified Delivery Accounting, Demo Metric Isolation) │
│  • `storageAdapter.ts` (Interface: LocalStorage now -> Supabase RPC ready)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Architecture & Phased Implementation

### Phase 1: Environment & Core Service Architecture
- Inspect packages and install `leaflet` and `@types/leaflet`.
- Configure Tailwind and Google Fonts (`Playfair Display`, `Plus Jakarta Sans`) in `index.html` and `src/index.css`.
- Define complete TypeScript interfaces in `src/types/index.ts`.
- Implement `src/services/` layer:
  - `storageAdapter.ts`: Local storage abstraction with reactive event listeners and snapshot reset.
  - `foodSafetyService.ts`: FSSAI Surplus Food guideline rulebook, threshold validators, handling notes.
  - `donationService.ts`: Optimistic locking, reservation state machine, 4-tier quantity auditing.
  - `volunteerService.ts`: Dispatching, cancellation, failed pickup reporting, reassignment.
  - `impactService.ts`: Strict separation between demo baseline and user verified impact.
  - `seedData.ts`: Realistic pilot scenarios.

### Phase 2: Navigation, Layout & Editorial Landing Page
- Top Bar adhering to the 3-zone contract.
- Preview Sandbox Switcher banner with explicit role separation.
- Editorial Landing Page with hero split, demonstration impact stats, 3-step narrative, stakeholder pillars, and Waste Intelligence teaser.
- Responsive design across mobile, tablet, and 1440px desktop.

### Phase 3: Interactive Leaflet Map Engine
- Custom Leaflet component with brand SVG markers (donor green, NGO terracotta, volunteer courier), interactive popups, and route polylines.

### Phase 4: Donor Portal & Streamlined Creation
- Donor Dashboard with real-time KPI metrics and recent donation ledger.
- Single-page donation form with FSSAI safety inputs, dietary tags, and 4-tier quantity breakdown.

### Phase 5: NGO Portal & Atomic Food Discovery
- Split-screen layout: filterable listing on left, live Leaflet map on right.
- Atomic reservation lock flow with duplicate-booking guard and immediate confirmation modal.

### Phase 6: Volunteer Dispatch & Exception Workflows
- Available tasks queue with delivery route details.
- 4-step progression (`Accepted` $\rightarrow$ `Arrived at Donor` $\rightarrow$ `Surplus Picked Up` $\rightarrow$ `Delivered to NGO`).
- Exception handling: task cancellation before pickup and on-site failed pickup reporting.

### Phase 7: Food Waste Intelligence & Safety Inspector
- FSSAI Food Safety module with handling instructions and flagged condition alerts.
- Food Waste Intelligence dashboard with trend charts, category distributions, day-of-week heatmaps, and "Your Next Better Decision" heuristics.

### Phase 8: Verification & Compilation
- Co-execute `compile_applet` and `lint_applet` to verify clean build and zero syntax or type errors.
