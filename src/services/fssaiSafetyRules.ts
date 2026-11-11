/**
 * FoodBridge Food Safety and Quality Assessment Service
 *
 * Configurable thresholds separate from UI with documented verification status:
 * Sources:
 * - Schedule 4 (General Sanitary Practices, FSSAI) - Verified baseline: Hot holding >= 65°C, cold <= 5°C.
 * - Codex Alimentarius CAC/GL 20-1995 (Principles for Food Surplus Redistribution) - 2h/4h ready-to-eat rule.
 * - FSSAI (Labeling & Display) Regulations - Allergen declarations.
 *
 * NOTE: Outcomes are structured assessment recommendations for human review,
 * NOT automated guarantees or certifications of food safety.
 */

import {
  FoodCategory,
  FoodSafetyAssessment,
  PackagingCondition,
  SafetyAssessmentOutcome,
  SafetyComplianceStatus,
  StorageCondition,
  TemperatureUnit,
} from '../types';

export interface DocumentedRuleThreshold {
  value: number;
  unit: string;
  sourceDoc: string;
  verificationStatus: 'verified_official_standard' | 'operational_recommended_guideline' | 'unverified_pending_audit';
  notes: string;
}

export const DOCUMENTED_SAFETY_THRESHOLDS: Record<string, DocumentedRuleThreshold> = {
  minHotHoldingTempC: {
    value: 65,
    unit: '°C',
    sourceDoc: 'FSSAI Schedule 4 Part II',
    verificationStatus: 'verified_official_standard',
    notes: 'Hot food must be held at or above 65°C to inhibit bacterial proliferation.',
  },
  maxColdHoldingTempC: {
    value: 5,
    unit: '°C',
    sourceDoc: 'FSSAI Schedule 4 Part II',
    verificationStatus: 'verified_official_standard',
    notes: 'Perishable cooked/chilled food must be held at or below 5°C.',
  },
  maxFrozenTempC: {
    value: -18,
    unit: '°C',
    sourceDoc: 'Codex CAC/GL 20-1995 Section 5.2',
    verificationStatus: 'verified_official_standard',
    notes: 'Deep freeze holding standard.',
  },
  maxAmbientTempC: {
    value: 25,
    unit: '°C',
    sourceDoc: 'Operational recommended guideline',
    verificationStatus: 'operational_recommended_guideline',
    notes: 'Dry goods ambient storage threshold (cool, dry place).',
  },
  maxHotHeldHours: {
    value: 4,
    unit: 'hours',
    sourceDoc: 'Codex CAC/GL 20-1995 (4-hour rule)',
    verificationStatus: 'verified_official_standard',
    notes: 'Hot prepared food held >= 65°C must be consumed within 4 hours of finish.',
  },
  maxRefrigeratedCookedHours: {
    value: 48,
    unit: 'hours',
    sourceDoc: 'FSSAI Recovery and Redistribution Guidelines (2019)',
    verificationStatus: 'verified_official_standard',
    notes: 'Chilled cooked food safe up to 48 hours under unbroken cold chain.',
  },
  maxAmbientPerishableHours: {
    value: 2,
    unit: 'hours',
    sourceDoc: 'Codex Danger Zone limit (2-hour limit)',
    verificationStatus: 'verified_official_standard',
    notes: 'Perishable cooked meals at ambient temperatures enter the danger zone (5°C-60°C).',
  },
  maxBakeryShelfHours: {
    value: 72,
    unit: 'hours',
    sourceDoc: 'Operational industry shelf study',
    verificationStatus: 'operational_recommended_guideline',
    notes: 'Uncut dry bread and rolls shelf life without preservatives.',
  },
  maxFreshProduceDays: {
    value: 5,
    unit: 'days',
    sourceDoc: 'Post-harvest Handling Guideline',
    verificationStatus: 'unverified_pending_audit',
    notes: 'Uncut fruits and raw vegetables pending local climate and ripening audit.',
  },
};

export const FSSAI_SURPLUS_RULES_CONFIG = {
  minHotHoldingTempC: DOCUMENTED_SAFETY_THRESHOLDS.minHotHoldingTempC.value,
  maxColdHoldingTempC: DOCUMENTED_SAFETY_THRESHOLDS.maxColdHoldingTempC.value,
  maxHotHeldHours: DOCUMENTED_SAFETY_THRESHOLDS.maxHotHeldHours.value,
  maxAmbientPerishableHours: DOCUMENTED_SAFETY_THRESHOLDS.maxAmbientPerishableHours.value,
  maxBakeryShelfHours: DOCUMENTED_SAFETY_THRESHOLDS.maxBakeryShelfHours.value,
};

export const FSSAI_LEGAL_CITATIONS = {
  hotHolding: 'FSSAI Schedule 4 Part II',
  coldHolding: 'FSSAI Schedule 4 Part II',
  timeControl: 'Codex CAC/GL 20-1995 Time Control',
  labeling: 'FSSAI Labeling & Display Regs',
};

export function convertToCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === 'fahrenheit') {
    return Math.round(((value - 32) * (5 / 9)) * 10) / 10;
  }
  return value;
}

export function evaluateFoodSafetyAssessment(params: {
  category: FoodCategory;
  storageCondition: StorageCondition;
  temperature?: number;
  temperatureUnit?: TemperatureUnit;
  preparationTimestamp: string;
  isAllergenLabelled: boolean;
  isCleanPackaged: boolean;
  packagingCondition?: PackagingCondition;
  foodHandlingNotes?: string;
  bestBeforeTimestamp?: string;
}): FoodSafetyAssessment {
  const now = new Date();
  const prepDate = new Date(params.preparationTimestamp);
  const hoursSincePrep = isNaN(prepDate.getTime())
    ? 0
    : Math.max(0, (now.getTime() - prepDate.getTime()) / (1000 * 60 * 60));

  const reasons: string[] = [];
  const warnings: string[] = [];
  const missingInfo: string[] = [];
  const guidance: string[] = [];
  const notes: string[] = [];

  let outcome: SafetyAssessmentOutcome = 'SUITABLE_FOR_REVIEW';
  let complianceStatus: SafetyComplianceStatus = 'compliant';
  let citation = 'FSSAI Surplus Food Regulations (2019) / Codex CAC/GL 20-1995';
  let maxHoldingHours = 4;
  let requiresColdChain = false;
  let requiresThermalTransit = false;

  const tempCelsius = params.temperature !== undefined
    ? convertToCelsius(params.temperature, params.temperatureUnit || 'celsius')
    : undefined;

  // 1. Preparation timestamp validation
  if (!params.preparationTimestamp || isNaN(prepDate.getTime())) {
    missingInfo.push('Preparation date and time not recorded.');
    outcome = 'INCOMPLETE_INFORMATION';
    complianceStatus = 'incomplete_flagged';
  } else if (prepDate > now) {
    warnings.push('Preparation time is set in the future. Needs clock alignment.');
    outcome = 'NEEDS_REVIEW';
    complianceStatus = 'incomplete_flagged';
  }

  // 2. Packaging condition assessment
  if (params.packagingCondition === 'damaged_packaging') {
    reasons.push('Packaging is damaged or unsealed. High risk of contamination.');
    outcome = 'REJECTED';
    complianceStatus = 'rejected_unsafe';
  } else if (!params.isCleanPackaged && params.packagingCondition !== 'food_grade_sealed') {
    warnings.push('Packaging is not verified as food-grade sealed. Recipient NGO must inspect seals prior to consumption.');
    if (outcome === 'SUITABLE_FOR_REVIEW') {
      outcome = 'NEEDS_REVIEW';
      complianceStatus = 'incomplete_flagged';
    }
  } else {
    reasons.push('Packaging verified: Sealed in sanitized, food-grade containers.');
  }

  // 3. Allergen disclosures
  if (!params.isAllergenLabelled) {
    warnings.push('Allergen disclosures not marked on packaging. Mandatory audit required before distribution to shelter residents with food allergies.');
    if (outcome === 'SUITABLE_FOR_REVIEW') {
      outcome = 'NEEDS_REVIEW';
      if (complianceStatus === 'compliant') complianceStatus = 'caution_urgent';
    }
  } else {
    reasons.push('Allergen declarations documented.');
  }

  // 4. Category-Specific & Storage Matrix Checks
  switch (params.storageCondition) {
    case 'hot_held':
      maxHoldingHours = DOCUMENTED_SAFETY_THRESHOLDS.maxHotHeldHours.value;
      requiresThermalTransit = true;
      guidance.push('Must transport in insulated thermal carriers maintaining >= 60°C during transit.');
      citation = `${DOCUMENTED_SAFETY_THRESHOLDS.minHotHoldingTempC.sourceDoc} (Hot Holding)`;

      if (tempCelsius === undefined || isNaN(tempCelsius)) {
        missingInfo.push('Core temperature not logged for hot-held food.');
        warnings.push('Temperature reading missing: Volunteer/NGO must verify core temperature >= 65°C upon handover.');
        if (outcome !== 'REJECTED') {
          outcome = 'INCOMPLETE_INFORMATION';
          complianceStatus = 'incomplete_flagged';
        }
      } else if (tempCelsius < DOCUMENTED_SAFETY_THRESHOLDS.minHotHoldingTempC.value) {
        reasons.push(`Temperature breach: Recorded ${tempCelsius}°C is below the required 65°C threshold. Danger zone multiplication risk.`);
        outcome = 'REJECTED';
        complianceStatus = 'rejected_unsafe';
      } else {
        reasons.push(`Temperature compliant: ${tempCelsius}°C (standard >= 65°C).`);
      }

      if (hoursSincePrep > maxHoldingHours) {
        reasons.push(`Hot holding elapsed (${hoursSincePrep.toFixed(1)}h) exceeds safe holding standard (${maxHoldingHours}h).`);
        outcome = 'REJECTED';
        complianceStatus = 'rejected_unsafe';
      } else if (maxHoldingHours - hoursSincePrep < 1.5) {
        warnings.push(`Urgent: Only ${(maxHoldingHours - hoursSincePrep).toFixed(1)} hours remaining in the safe holding window.`);
        if (outcome === 'SUITABLE_FOR_REVIEW') {
          outcome = 'NEEDS_REVIEW';
          complianceStatus = 'caution_urgent';
        }
      }
      break;

    case 'refrigerated':
      maxHoldingHours = DOCUMENTED_SAFETY_THRESHOLDS.maxRefrigeratedCookedHours.value;
      requiresColdChain = true;
      guidance.push('Maintain unbroken cold chain using ice-lined cooler boxes (<= 5°C).');
      citation = `${DOCUMENTED_SAFETY_THRESHOLDS.maxColdHoldingTempC.sourceDoc} (Cold Holding)`;

      if (tempCelsius === undefined || isNaN(tempCelsius)) {
        missingInfo.push('Refrigerator temperature not logged for chilled storage.');
        warnings.push('Cold chain temperature not logged. Must verify <= 5°C upon courier collection.');
        if (outcome !== 'REJECTED') {
          outcome = 'INCOMPLETE_INFORMATION';
          complianceStatus = 'incomplete_flagged';
        }
      } else if (tempCelsius > DOCUMENTED_SAFETY_THRESHOLDS.maxColdHoldingTempC.value) {
        reasons.push(`Temperature breach: Chilled storage temperature (${tempCelsius}°C) exceeds 5°C safety limit.`);
        outcome = 'REJECTED';
        complianceStatus = 'rejected_unsafe';
      } else {
        reasons.push(`Temperature compliant: ${tempCelsius}°C (cold chain <= 5°C).`);
      }

      if (hoursSincePrep > maxHoldingHours) {
        reasons.push(`Refrigerated holding elapsed (${hoursSincePrep.toFixed(1)}h) exceeds 48h limit.`);
        outcome = 'REJECTED';
        complianceStatus = 'rejected_unsafe';
      } else if (maxHoldingHours - hoursSincePrep < 6) {
        warnings.push(`Approaching cold-holding window limit: ${(maxHoldingHours - hoursSincePrep).toFixed(1)} hours remaining.`);
        if (outcome === 'SUITABLE_FOR_REVIEW') {
          outcome = 'NEEDS_REVIEW';
          complianceStatus = 'caution_urgent';
        }
      }
      break;

    case 'frozen':
      maxHoldingHours = 720;
      requiresColdChain = true;
      guidance.push('Transport frozen lots with cold packs without defrosting.');
      citation = DOCUMENTED_SAFETY_THRESHOLDS.maxFrozenTempC.sourceDoc;

      if (tempCelsius !== undefined && tempCelsius > DOCUMENTED_SAFETY_THRESHOLDS.maxFrozenTempC.value) {
        warnings.push(`Frozen lot temperature (${tempCelsius}°C) is above standard -18°C. Inspect for thawing.`);
        if (outcome === 'SUITABLE_FOR_REVIEW') {
          outcome = 'NEEDS_REVIEW';
          complianceStatus = 'caution_urgent';
        }
      } else {
        reasons.push('Deep frozen storage recorded.');
      }
      break;

    case 'ambient':
      if (params.category === 'prepared_meals' || params.category === 'dairy_chilled') {
        maxHoldingHours = DOCUMENTED_SAFETY_THRESHOLDS.maxAmbientPerishableHours.value;
        guidance.push('High-risk: Perishable food kept at ambient temperature has a strict 2-hour window.');
        if (hoursSincePrep > maxHoldingHours) {
          reasons.push(`Perishable food ambient threshold breached: ${hoursSincePrep.toFixed(1)} hours elapsed (safe limit is 2 hours).`);
          outcome = 'REJECTED';
          complianceStatus = 'rejected_unsafe';
        } else {
          warnings.push(`Urgent dispatch required: only ${(maxHoldingHours - hoursSincePrep).toFixed(1)} hours remaining at room temperature.`);
          outcome = 'NEEDS_REVIEW';
          complianceStatus = 'caution_urgent';
        }
      } else if (params.category === 'bakery_grains') {
        maxHoldingHours = DOCUMENTED_SAFETY_THRESHOLDS.maxBakeryShelfHours.value;
        reasons.push('Dry bakery items: ambient room storage is acceptable if protected from pests and humidity.');
      } else if (params.category === 'fresh_produce') {
        maxHoldingHours = DOCUMENTED_SAFETY_THRESHOLDS.maxFreshProduceDays.value * 24;
        reasons.push('Fresh uncut produce: ambient ventilated storage acceptable. Inspect for spoilage upon receipt.');
        warnings.push('Fresh produce shelf threshold is an operational estimate pending local temperature audit.');
      } else {
        maxHoldingHours = 720; // 30 days
        reasons.push('Packaged dry staples: shelf-stable under ambient conditions.');
      }
      break;
  }

  // Best-before date check if applicable
  if (params.bestBeforeTimestamp) {
    const bbDate = new Date(params.bestBeforeTimestamp);
    if (!isNaN(bbDate.getTime()) && bbDate < now) {
      warnings.push(`Best-before / use-by date (${bbDate.toLocaleDateString()}) has elapsed.`);
      if (outcome === 'SUITABLE_FOR_REVIEW') {
        outcome = 'NEEDS_REVIEW';
        complianceStatus = 'caution_urgent';
      }
    }
  }

  const safeUntil = new Date(prepDate.getTime() + maxHoldingHours * 60 * 60 * 1000);

  // Combine safety notes for backward compatibility
  notes.push(...reasons);
  notes.push(...warnings);
  notes.push(...missingInfo);

  return {
    storageCondition: params.storageCondition,
    temperatureCelsius: tempCelsius,
    temperatureUnit: params.temperatureUnit || 'celsius',
    preparationTimestamp: params.preparationTimestamp,
    safeConsumeUntil: safeUntil.toISOString(),
    hoursSincePreparation: Math.round(hoursSincePrep * 10) / 10,
    maxSafeHoldingHours: maxHoldingHours,
    fssaiRuleCitation: citation,
    isAllergenLabelled: params.isAllergenLabelled,
    isCleanPackaged: params.isCleanPackaged,
    packagingCondition: params.packagingCondition || (params.isCleanPackaged ? 'food_grade_sealed' : 'loose_unsealed'),
    foodHandlingNotes: params.foodHandlingNotes,
    bestBeforeTimestamp: params.bestBeforeTimestamp,
    complianceStatus,
    assessmentOutcome: outcome,
    assessmentReasons: reasons,
    missingInformation: missingInfo,
    warnings,
    handlingGuidance: guidance,
    safetyNotes: notes,
    requiresColdChainTransit: requiresColdChain,
    requiresThermalTransit: requiresThermalTransit,
    assessedAt: now.toISOString(),
  };
}

// Backward compatibility alias for existing callers
export const evaluateFssaiFoodSafety = evaluateFoodSafetyAssessment;
