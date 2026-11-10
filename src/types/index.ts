/**
 * FoodBridge Core Data Model & Types
 * Engineered for atomic state operations, FSSAI surplus safety compliance,
 * 4-tier quantity transparency, and direct migration path to Supabase.
 */

export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'public';

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'nut_free'
  | 'dairy_free'
  | 'gluten_free';

export type FoodCategory =
  | 'prepared_meals'
  | 'fresh_produce'
  | 'bakery_grains'
  | 'dairy_chilled'
  | 'packaged_dry';

export type StorageCondition =
  | 'hot_held'      // >= 65°C
  | 'refrigerated'  // <= 5°C
  | 'frozen'        // <= -18°C
  | 'ambient';      // Cool dry place <= 25°C

export type DonationStatus =
  | 'available'              // Published and open for NGO reservation
  | 'locking'                // Transient lock being acquired
  | 'reserved'               // Claimed by NGO, awaiting volunteer assignment
  | 'assigned'               // Volunteer accepted task
  | 'arrived_at_donor'       // Volunteer on-site at donor
  | 'picked_up'              // Volunteer confirmed physical pickup
  | 'in_transit'             // En route to NGO
  | 'delivered'              // NGO signed off and verified
  | 'cancelled_by_ngo'       // Released back to pool
  | 'volunteer_cancelled'    // Reopened for urgent dispatch
  | 'pickup_failed';         // Exception reported on-site (spoiled, closed, etc.)

export type SafetyComplianceStatus =
  | 'compliant'              // Meets all documented FSSAI guidelines
  | 'caution_urgent'         // Safe but approaching holding deadline (< 90m)
  | 'incomplete_flagged'     // Critical parameters unrecorded (prep time/temp)
  | 'rejected_unsafe';       // Violates safety thresholds (danger zone breach)

export interface QuantityLedger {
  donorEstimatedKg: number;      // Self-reported by donor
  servingsEstimate: number;      // Estimated meals (default ~350g/serving)
  measuredKg?: number;           // Scale measured weight if available
  pickupConfirmedKg?: number;    // Physically verified during volunteer handover
}

export interface FoodSafetyAssessment {
  storageCondition: StorageCondition;
  temperatureCelsius?: number;
  preparationTimestamp: string;  // ISO string
  safeConsumeUntil: string;      // ISO string
  hoursSincePreparation: number;
  maxSafeHoldingHours: number;
  fssaiRuleCitation: string;
  isAllergenLabelled: boolean;
  isCleanPackaged: boolean;
  complianceStatus: SafetyComplianceStatus;
  safetyNotes: string[];
  requiresColdChainTransit: boolean;
  requiresThermalTransit: boolean;
}

export interface FoodDonation {
  id: string;
  origin: 'curated_demo' | 'user_created';
  donorId: string;
  donorName: string;
  donorType: 'restaurant' | 'hotel' | 'canteen' | 'caterer' | 'supermarket' | 'bakery';
  donorAddress: string;
  donorLat: number;
  donorLng: number;
  donorContactPhone: string;

  foodName: string;
  foodCategory: FoodCategory;
  description: string;
  dietaryTags: DietaryTag[];

  quantity: QuantityLedger;
  safety: FoodSafetyAssessment;

  pickupWindowStart: string; // ISO string
  pickupWindowEnd: string;   // ISO string
  specialHandlingNotes?: string;

  status: DonationStatus;
  reservedByNgoId?: string;
  reservedByNgoName?: string;
  ngoAddress?: string;
  ngoLat?: number;
  ngoLng?: number;

  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  volunteerPhone?: string;

  reservationLock?: {
    lockedAt: string;
    lockExpiresAt: string;
    leaseHolderId: string;
  };

  timeline: {
    status: DonationStatus;
    timestamp: string;
    actor: string;
    note?: string;
  }[];

  createdAt: string;
  updatedAt: string;
  photoUrl?: string;
}

export interface VolunteerTask {
  id: string;
  donationId: string;
  volunteerId: string;
  status: DonationStatus;
  urgency: 'normal' | 'urgent_reassigned';
  acceptedAt: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  donorContact: string;
  ngoContact: string;
  donorName: string;
  ngoName: string;
  foodName: string;
  quantityKg: number;
  pickupDeadline: string;
  notes?: string;
  failureReason?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  organizationName?: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  verified: boolean;
  serviceRadiusKm?: number;      // For volunteers
  ngoRegistrationNumber?: string; // For NGOs
  organizationType?: string;      // For donors
}

export interface ImpactStatistics {
  totalSurplusKgDiverted: number;
  totalMealsRedistributed: number;
  completedRescuesCount: number;
  participatingDonorsCount: number;
  participatingNgosCount: number;
  activeVolunteersCount: number;
  co2EquivalentPreventedKg: number; // ~2.5 kg CO2e per kg food saved
}

export interface WasteIntelligenceMetric {
  category: FoodCategory;
  totalKg: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface BetterDecisionRecommendation {
  id: string;
  title: string;
  insight: string;
  actionableRecommendation: string;
  confidenceScore: number;
  frequency: string;
  applicableDonorTypes: string[];
}
