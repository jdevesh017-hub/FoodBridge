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
  | 'available'                   // Published and open for NGO reservation
  | 'locking'                     // Transient lock being acquired
  | 'reserved'                    // Claimed by NGO, awaiting volunteer assignment
  | 'assigned'                    // Volunteer accepted task
  | 'arrived_at_donor'            // Volunteer on-site at donor
  | 'picked_up'                   // Volunteer confirmed physical pickup
  | 'in_transit'                  // En route to NGO
  | 'awaiting_ngo_confirmation'   // Volunteer delivered to NGO premises; awaiting NGO receipt verification
  | 'delivered'                   // NGO signed off and verified
  | 'cancelled_by_donor'          // Donor cancelled surplus
  | 'cancelled_by_ngo'            // Released back to pool by NGO
  | 'volunteer_cancelled'         // Reopened for urgent dispatch
  | 'pickup_failed'               // Exception reported at pickup (spoiled, closed, etc.)
  | 'delivery_issue'              // Exception reported during transit or at NGO handover
  | 'disputed';                   // Discrepancy reported during NGO verification (quantity, damage, safety)

export type SafetyComplianceStatus =
  | 'compliant'              // Meets all documented FSSAI guidelines
  | 'caution_urgent'         // Safe but approaching holding deadline (< 90m)
  | 'incomplete_flagged'     // Critical parameters unrecorded (prep time/temp)
  | 'rejected_unsafe';       // Violates safety thresholds (danger zone breach)

export type SafetyAssessmentOutcome =
  | 'SUITABLE_FOR_REVIEW'
  | 'NEEDS_REVIEW'
  | 'REJECTED'
  | 'INCOMPLETE_INFORMATION';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type PackagingCondition =
  | 'food_grade_sealed'
  | 'covered_clean'
  | 'loose_unsealed'
  | 'damaged_packaging';

export interface FoodSafetyAssessment {
  storageCondition: StorageCondition;
  temperatureCelsius?: number;
  temperatureUnit?: TemperatureUnit;
  preparationTimestamp: string;  // ISO string
  safeConsumeUntil: string;      // ISO string
  hoursSincePreparation: number;
  maxSafeHoldingHours: number;
  fssaiRuleCitation: string;
  isAllergenLabelled: boolean;
  isCleanPackaged: boolean;
  packagingCondition?: PackagingCondition;
  foodHandlingNotes?: string;
  bestBeforeTimestamp?: string;
  complianceStatus: SafetyComplianceStatus;
  assessmentOutcome: SafetyAssessmentOutcome;
  assessmentReasons: string[];
  missingInformation: string[];
  warnings: string[];
  handlingGuidance: string[];
  safetyNotes: string[];
  requiresColdChainTransit: boolean;
  requiresThermalTransit: boolean;
  assessedAt: string;
}

export interface FoodSafetyHistoryRecord {
  assessedAt: string;
  previousOutcome?: SafetyAssessmentOutcome;
  newOutcome: SafetyAssessmentOutcome;
  reasons: string[];
  warnings: string[];
  missingInformation: string[];
  changesSummary: string;
}

export interface DeliveryImpactReceipt {
  receiptId: string;
  donationId: string;
  deliveredAt: string;
  donorName: string;
  ngoName: string;
  volunteerName: string;
  foodName: string;
  donorEstimatedKg: number;
  pickupConfirmedKg: number;
  deliveredKg: number;
  mealsProvided: number;
  co2PreventedKg: number;
  fssaiRuleCitation: string;
}

export interface DiscrepancyReport {
  reportedAt: string;
  reportedByRole: 'ngo' | 'volunteer' | 'donor';
  reporterName: string;
  issueType: 'damaged_food' | 'quantity_mismatch' | 'safety_temp_breach' | 'packaging_breach' | 'facility_closed';
  details: string;
  actualWeightReceivedKg?: number;
}

export interface QuantityLedger {
  donorEstimatedKg: number;
  servingsEstimate: number;
  measuredKg?: number;
  pickupConfirmedKg?: number;
  deliveredKg?: number;
  discrepancyKg?: number;
}

export type AuditEventType =
  | 'donation_created'
  | 'donation_updated'
  | 'donation_cancelled'
  | 'reservation_locked'
  | 'reservation_confirmed'
  | 'reservation_released'
  | 'task_accepted'
  | 'volunteer_arrived'
  | 'pickup_confirmed'
  | 'pickup_failed'
  | 'delivery_confirmed'
  | 'delivery_issue_reported'
  | 'volunteer_cancelled'
  | 'dispute_raised'
  | 'dispute_resolved';

export interface AuditEvent {
  id: string; // evt_...
  entityId: string; // e.g. don_...
  entityType: 'donation' | 'reservation' | 'task' | 'demand' | 'user';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  eventType: AuditEventType;
  timestamp: string; // ISO string
  metadata?: Record<string, any>;
  note?: string;
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
  impactReceipt?: DeliveryImpactReceipt;
  discrepancyReport?: DiscrepancyReport;
  safetyHistory?: FoodSafetyHistoryRecord[];
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
  isDemoUser?: boolean;           // Distinguishes pre-seeded demo accounts from registered users
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

// --- Phase 4: Food Waste Intelligence & Analytics Types ---

export interface NgoDemandRequest {
  id: string;
  ngoId: string;
  ngoName: string;
  category: FoodCategory;
  requestedDailyKg: number;
  servingsTarget: number;
  requiredByDate: string; // ISO date
  urgency: 'high' | 'medium' | 'normal';
  status: 'active' | 'partially_fulfilled' | 'fulfilled' | 'expired';
  fulfilledKg: number;
  notes?: string;
  createdAt: string;
}

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsFilterOptions {
  timeRange: AnalyticsTimeRange;
  category?: 'all' | FoodCategory;
  donorId?: string;
  ngoId?: string;
  volunteerId?: string;
  status?: 'all' | DonationStatus;
  origin?: 'all' | 'user_created' | 'curated_demo';
}

export interface FoodWasteKpis {
  totalSurplusRecordedKg: number;
  totalDeliveredKg: number;
  recoveryRatePct: number;
  pendingQuantitiesKg: {
    available: number;
    reserved: number;
    assigned: number;
    pickedUp: number;
    totalPending: number;
  };
  failedPickupsCount: number;
  averageDeliveryMinutes: number | null; // null if insufficient completed records with valid timestamps
  completedDeliveriesCount: number;
  totalRecordsCount: number;
  hasSufficientData: boolean;
}

export interface CategorySurplusBreakdown {
  category: FoodCategory;
  recordedKg: number;
  deliveredKg: number;
  pendingKg: number;
  percentageOfTotal: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Mon 10/12"
  recordedKg: number;
  deliveredKg: number;
}

export interface WeekdayDistributionPoint {
  day: string; // "Mon", "Tue", etc.
  dayIndex: number; // 0 (Sun) to 6 (Sat)
  recordedKg: number;
  count: number;
  percentage: number;
}

export interface SupplyVsDemandMetric {
  category: FoodCategory;
  supplyRecordedKg: number;
  demandRequestedKg: number;
  reservedKg: number;
  receivedKg: number;
  unfulfilledDemandKg: number;
  coverageRatioPct: number;
}

export interface RecurringPatternInsight {
  id: string;
  type: 'donor_recurring' | 'category_spike' | 'weekday_cadence' | 'location_hub';
  title: string;
  description: string;
  supportingRecordCount: number;
  analysisPeriod: string;
  confidenceScore: number;
  evidenceDetails: string;
}

export interface WastePreventionRecommendation {
  id: string;
  title: string;
  detectedPattern: string;
  supportingRecordCount: number;
  analysisPeriod: string;
  suggestedAction: string;
  confidenceIndicator: 'high' | 'medium' | 'emerging';
  confidenceScore: number;
  category?: FoodCategory;
  targetAudience: 'donor' | 'ngo' | 'all';
  hasSufficientEvidence: boolean;
}

export interface RoleAnalyticsSummary {
  role: UserRole;
  donorStats?: {
    ownSurplusKg: number;
    ownDeliveredKg: number;
    ownRecoveryRatePct: number;
    topCategory: FoodCategory | null;
    activeSurplusListingsCount: number;
    completedDeliveriesCount: number;
    recommendations: WastePreventionRecommendation[];
  };
  ngoStats?: {
    totalReceivedKg: number;
    mealsProvided: number;
    activeReservationsCount: number;
    demandFulfillmentPct: number;
    unfulfilledKg: number;
  };
  volunteerStats?: {
    completedDeliveriesCount: number;
    totalDeliveredKg: number;
    failedPickupsCount: number;
    deliverySuccessRatePct: number;
    avgDeliveryDurationMinutes: number | null;
  };
}
