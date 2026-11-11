# FoodBridge — Supabase Migration Architecture Guide
**Phase 5 Architectural Blueprint: Transition from Local Prototype to Production Postgres & Supabase**

---

## 1. Executive Architecture Summary

During Phases 1 through 5, FoodBridge operated as a high-fidelity frontend and local repository prototype using a versioned, fault-tolerant `LocalStorage` adapter and repository contracts (`IDonationRepository`, `IUserRepository`, `IReservationRepository`, `IDeliveryRepository`, `IAuditEventRepository`, `IDemandRepository`).

By introducing typed repository interfaces and isolating persistence logic from React UI components, the migration to Supabase can be performed seamlessly:
1. UI components interact exclusively with the repository contracts.
2. A new set of Supabase repositories (`SupabaseDonationRepository`, `SupabaseUserRepository`, etc.) implements the exact same repository interfaces using `@supabase/supabase-js`.
3. Client-side lease locks are replaced with server-side transactional locking (`SELECT ... FOR UPDATE`) in an atomic PL/pgSQL function.
4. Client-side role checks are backed by PostgreSQL Row Level Security (RLS) policies driven by Supabase Auth JWT custom claims.

---

## 2. Relational Database Schema & Table Mappings

All IDs in FoodBridge use semantic typed prefixes (`usr_`, `don_`, `rcpt_,` `evt_`, `dem_`). In Supabase Postgres, IDs can either remain `TEXT PRIMARY KEY` (preserving external URL compatibility) or map to `UUID PRIMARY KEY` with automatic default generation.

### 2.1 Table: `profiles`
Replaces the `UserProfile` interface and Supabase `auth.users` metadata.

```sql
CREATE TYPE user_role AS ENUM ('donor', 'ngo', 'volunteer', 'admin');
CREATE TYPE donor_facility_type AS ENUM ('restaurant', 'hotel', 'canteen', 'caterer', 'supermarket', 'bakery');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'donor',
    full_name TEXT NOT NULL,
    organization_name TEXT,
    facility_type donor_facility_type,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_geo ON public.profiles(lat, lng);
```

### 2.2 Table: `donations`
Maps to `FoodDonation` interface, preserving the 4-tier quantity ledger and FSSAI assessment structure.

```sql
CREATE TYPE donation_status AS ENUM (
    'available',
    'locking',
    'reserved',
    'assigned',
    'arrived_at_donor',
    'picked_up',
    'in_transit',
    'awaiting_ngo_confirmation',
    'delivered',
    'cancelled_by_donor',
    'cancelled_by_ngo',
    'volunteer_cancelled',
    'pickup_failed',
    'delivery_issue',
    'disputed'
);

CREATE TYPE food_category AS ENUM (
    'prepared_meals',
    'packaged_groceries',
    'fresh_produce',
    'dairy_refrigerated',
    'bakery_breads',
    'beverages'
);

CREATE TYPE storage_condition AS ENUM ('ambient', 'refrigerated', 'frozen', 'hot_holding');
CREATE TYPE packaging_condition AS ENUM ('tamper_evident_sealed', 'clean_covered_containers', 'original_manufacturer_packaging', 'open_or_damaged');
CREATE TYPE safety_outcome AS ENUM ('SUITABLE_FOR_REVIEW', 'NEEDS_REVIEW', 'REJECTED', 'INCOMPLETE_INFORMATION');

CREATE TABLE public.donations (
    id TEXT PRIMARY KEY DEFAULT ('don_' || substr(md5(random()::text), 1, 12)),
    origin TEXT NOT NULL DEFAULT 'user_created' CHECK (origin IN ('curated_demo', 'user_created')),
    
    -- Donor Reference
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICTED,
    donor_name TEXT NOT NULL,
    donor_type donor_facility_type NOT NULL,
    donor_address TEXT NOT NULL,
    donor_lat NUMERIC(9, 6) NOT NULL,
    donor_lng NUMERIC(9, 6) NOT NULL,
    donor_contact_phone TEXT NOT NULL,
    
    -- Food Details
    food_name TEXT NOT NULL,
    food_category food_category NOT NULL,
    description TEXT NOT NULL,
    dietary_tags TEXT[] NOT NULL DEFAULT '{}',
    photo_url TEXT,
    
    -- 4-Tier Quantity Ledger (Never overwrite original estimate)
    donor_estimated_kg NUMERIC(8, 2) NOT NULL CHECK (donor_estimated_kg > 0 AND donor_estimated_kg <= 1000),
    servings_estimate INT NOT NULL CHECK (servings_estimate >= 1),
    measured_kg NUMERIC(8, 2) CHECK (measured_kg > 0),
    pickup_confirmed_kg NUMERIC(8, 2) CHECK (pickup_confirmed_kg > 0),
    delivered_kg NUMERIC(8, 2) CHECK (delivered_kg >= 0),
    discrepancy_kg NUMERIC(8, 2), -- delivered_kg - pickup_confirmed_kg
    
    -- Safety Logging & FSSAI Verification
    safety_outcome safety_outcome NOT NULL,
    compliance_status TEXT NOT NULL,
    storage_condition storage_condition NOT NULL,
    temperature_celsius NUMERIC(5, 2),
    elapsed_holding_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
    safe_consume_until TIMESTAMPTZ NOT NULL,
    fssai_rule_citation TEXT NOT NULL,
    is_clean_packaged BOOLEAN NOT NULL DEFAULT TRUE,
    is_allergen_labelled BOOLEAN NOT NULL DEFAULT FALSE,
    packaging_condition packaging_condition,
    food_handling_notes TEXT,
    best_before_timestamp TIMESTAMPTZ,
    safety_warnings TEXT[] NOT NULL DEFAULT '{}',
    missing_information TEXT[] NOT NULL DEFAULT '{}',
    
    -- Pickup Timing Window
    pickup_window_start TIMESTAMPTZ NOT NULL,
    pickup_window_end TIMESTAMPTZ NOT NULL,
    special_handling_notes TEXT,
    
    -- Operational Status
    status donation_status NOT NULL DEFAULT 'available',
    
    -- Stakeholder Claims
    reserved_by_ngo_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reserved_by_ngo_name TEXT,
    ngo_address TEXT,
    ngo_lat NUMERIC(9, 6),
    ngo_lng NUMERIC(9, 6),
    
    assigned_volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_volunteer_name TEXT,
    volunteer_phone TEXT,
    
    -- Transient Concurrency Lock
    lock_lease_holder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lock_acquired_at TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geospatial and query indexes
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_ngo ON public.donations(reserved_by_ngo_id);
CREATE INDEX idx_donations_volunteer ON public.donations(assigned_volunteer_id);
CREATE INDEX idx_donations_pickup_end ON public.donations(pickup_window_end);
CREATE INDEX idx_donations_geo ON public.donations(donor_lat, donor_lng);
```

### 2.3 Table: `impact_receipts`
Immutable proof-of-delivery impact record.

```sql
CREATE TABLE public.impact_receipts (
    id TEXT PRIMARY KEY DEFAULT ('rcpt_' || substr(md5(random()::text), 1, 12)),
    donation_id TEXT NOT NULL UNIQUE REFERENCES public.donations(id) ON DELETE RESTRICTED,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    donor_name TEXT NOT NULL,
    ngo_name TEXT NOT NULL,
    volunteer_name TEXT NOT NULL,
    food_name TEXT NOT NULL,
    donor_estimated_kg NUMERIC(8, 2) NOT NULL,
    pickup_confirmed_kg NUMERIC(8, 2) NOT NULL,
    delivered_kg NUMERIC(8, 2) NOT NULL,
    meals_provided INT NOT NULL,
    co2_prevented_kg NUMERIC(8, 2) NOT NULL,
    fssai_rule_citation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipts_donation ON public.impact_receipts(donation_id);
```

### 2.4 Table: `audit_events`
Append-only tamper-evident lifecycle event ledger.

```sql
CREATE TYPE audit_entity_type AS ENUM ('donation', 'reservation', 'task', 'demand', 'user');
CREATE TYPE audit_event_type AS ENUM (
    'donation_created',
    'donation_updated',
    'donation_cancelled',
    'reservation_locked',
    'reservation_confirmed',
    'reservation_released',
    'task_accepted',
    'volunteer_arrived',
    'pickup_confirmed',
    'pickup_failed',
    'delivery_confirmed',
    'delivery_issue_reported',
    'volunteer_cancelled',
    'dispute_raised',
    'dispute_resolved'
);

CREATE TABLE public.audit_events (
    id TEXT PRIMARY KEY DEFAULT ('evt_' || substr(md5(random()::text), 1, 14)),
    entity_id TEXT NOT NULL,
    entity_type audit_entity_type NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role user_role NOT NULL,
    event_type audit_event_type NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    note TEXT
);

CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_id);
CREATE INDEX idx_audit_events_timestamp ON public.audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_actor ON public.audit_events(actor_id);
```

### 2.5 Table: `demand_requests`
Maps to `NgoDemandRequest` for supply/demand matching.

```sql
CREATE TABLE public.demand_requests (
    id TEXT PRIMARY KEY DEFAULT ('dem_' || substr(md5(random()::text), 1, 10)),
    ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ngo_name TEXT NOT NULL,
    food_category food_category NOT NULL,
    target_servings INT NOT NULL CHECK (target_servings > 0),
    target_kg NUMERIC(8, 2) NOT NULL CHECK (target_kg > 0),
    date_required DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'partially_fulfilled', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_demand_requests_ngo ON public.demand_requests(ngo_id);
CREATE INDEX idx_demand_requests_status ON public.demand_requests(status);
```

---

## 3. Atomic Reservation Locking via PostgreSQL RPC

In the prototype, reservation double-booking prevention was managed client-side using `reservationLock.lockExpiresAt`. In Supabase, this is replaced by an atomic PL/pgSQL function using `SELECT ... FOR UPDATE` row-level locks.

```sql
CREATE OR REPLACE FUNCTION public.acquire_reservation_lock(
    p_donation_id TEXT,
    p_ngo_id UUID,
    p_lease_seconds INT DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_donation RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Acquire row-level exclusive lock on donation record
    SELECT * INTO v_donation
    FROM public.donations
    WHERE id = p_donation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Donation not found.');
    END IF;

    -- 2. Verify donation is available
    IF v_donation.status <> 'available' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Donation is no longer available (current status: ' || v_donation.status || ').'
        );
    END IF;

    -- 3. Check for active unexpired lease by another NGO
    IF v_donation.lock_expires_at IS NOT NULL AND v_donation.lock_expires_at > v_now THEN
        IF v_donation.lock_lease_holder_id <> p_ngo_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Donation is currently being reviewed by another organization. Please check back shortly.'
            );
        END IF;
    END IF;

    -- 4. Calculate lease expiration and grant lock
    v_expires_at := v_now + (p_lease_seconds || ' seconds')::INTERVAL;

    UPDATE public.donations
    SET lock_lease_holder_id = p_ngo_id,
        lock_acquired_at = v_now,
        lock_expires_at = v_expires_at,
        updated_at = v_now
    WHERE id = p_donation_id;

    -- 5. Record audit event
    INSERT INTO public.audit_events (
        entity_id, entity_type, actor_id, actor_name, actor_role, event_type, metadata, note
    ) VALUES (
        p_donation_id,
        'donation',
        p_ngo_id::text,
        'NGO Organization',
        'ngo',
        'reservation_locked',
        jsonb_build_object('lease_seconds', p_lease_seconds, 'expires_at', v_expires_at),
        'Atomic reservation lock acquired'
    );

    RETURN jsonb_build_object(
        'success', true,
        'expires_at', v_expires_at
    );
END;
$$;
```

---

## 4. Row Level Security (RLS) Policies

All tables in public schema must enforce RLS: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.

### 4.1 Profiles
```sql
-- Anyone authenticated can view public profiles (addresses masked by discovery views)
CREATE POLICY "Public profile discovery"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can only update their own profile
CREATE POLICY "Users modify own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);
```

### 4.2 Donations
```sql
-- Anyone authenticated can view available donations; participants can view reserved/delivered
CREATE POLICY "Donation select visibility"
ON public.donations FOR SELECT
USING (
    status = 'available'
    OR donor_id = auth.uid()
    OR reserved_by_ngo_id = auth.uid()
    OR assigned_volunteer_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Only donors can insert listings
CREATE POLICY "Donors create donations"
ON public.donations FOR INSERT
WITH CHECK (
    auth.uid() = donor_id
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'donor'
);

-- Donors can edit available donations; NGOs/volunteers can update per lifecycle transitions
CREATE POLICY "Workflow participants update donations"
ON public.donations FOR UPDATE
USING (
    (donor_id = auth.uid() AND status = 'available')
    OR (reserved_by_ngo_id = auth.uid())
    OR (assigned_volunteer_id = auth.uid())
    OR (lock_lease_holder_id = auth.uid())
);
```

### 4.3 Audit Events (Append-Only)
```sql
-- Read access for involved stakeholders
CREATE POLICY "Stakeholders view audit events"
ON public.audit_events FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated actors can insert audit records; NO UPDATE or DELETE allowed
CREATE POLICY "Actors append audit events"
ON public.audit_events FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

---

## 5. Supabase Auth JWT Integration

1. In Supabase Auth, when a user signs up or logs in, a custom access token hook (`auth.custom_jwt_claims`) injects the user's role into the JWT:
   ```json
   {
     "sub": "b2c1f3a2-1111-4444-8888-123456789abc",
     "email": "mumbai.central@swasthya.org",
     "app_metadata": {
       "role": "ngo",
       "organization": "Swasthya Foundation"
     }
   }
   ```
2. The `AuthService` in the frontend extracts `role` directly from the validated session JWT without separate round-trips.
3. RLS checks query `auth.jwt() -> 'app_metadata' ->> 'role'` for high-speed permission filtering.

---

## 6. Zero-Downtime Repository Swapping Strategy

The interface layer created in Phase 5 (`IDonationRepository`, `IUserRepository`, `IReservationRepository`, `IDeliveryRepository`, `IAuditEventRepository`, `IDemandRepository`) decouples all UI components from `localStorage`.

To switch the application from `localStorage` to Supabase:
1. Implement `SupabaseDonationRepository implements IDonationRepository`.
2. Implement `SupabaseUserRepository implements IUserRepository`.
3. In `src/repositories/index.ts`, change the exported singleton:
   ```typescript
   // Configuration flag: localStorage vs supabase
   const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

   export const donationRepository: IDonationRepository = USE_SUPABASE
     ? new SupabaseDonationRepository(supabaseClient)
     : new LocalStorageDonationRepository();
   ```
4. **No React component or dashboard file requires modification.** The migration is entirely transparent to the presentation layer.

