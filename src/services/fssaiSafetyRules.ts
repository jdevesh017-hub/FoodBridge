/**
 * FSSAI Surplus Food Safety Evaluation Service
 * References:
 * - FSSAI (Food Safety and Standards Authority of India) Recovery & Distribution Regulations
 * - Schedule 4 (General Hygienic and Sanitary Practices to be followed by Food Business Operators)
 * - Codex Alimentarius Code of Practice for Food Surplus Redistribution
 */

import { FoodCategory, FoodSafetyAssessment, SafetyComplianceStatus, StorageCondition } from '../types';

export interface SafetyRuleConfig {
  minHotHoldingTempC: number;
  maxColdHoldingTempC: number;
  maxFrozenTempC: number;
  maxAmbientTempC: number;
  maxHotHeldHours: number;
  maxRefrigeratedCookedHours: number;
  maxAmbientPerishableHours: number;
  maxBakeryShelfHours: number;
  maxFreshProduceDays: number;
}

export const FSSAI_SURPLUS_RULES_CONFIG: SafetyRuleConfig = {
  minHotHoldingTempC: 65,            // FSSAI Reg: Keep hot food >= 65°C
  maxColdHoldingTempC: 5,             // FSSAI Reg: Keep chilled food <= 5°C
  maxFrozenTempC: -18,                // Deep frozen <= -18°C
  maxAmbientTempC: 25,                // Ambient dry storage <= 25°C
  maxHotHeldHours: 4,                 // 4-hour rule: Hot cooked food must be eaten within 4 hours
  maxRefrigeratedCookedHours: 48,     // Properly chilled cooked food safe up to 48 hours
  maxAmbientPerishableHours: 2,       // Dangerous zone (5°C - 60°C) limit: max 2 hours
  maxBakeryShelfHours: 72,            // Dry baked goods: 72 hours
  maxFreshProduceDays: 5,             // Raw vegetables/fruits
};

export const FSSAI_LEGAL_CITATIONS = {
  generalSurplus: 'FSSAI Surplus Food Regs (2019) Clause 4(1): Surplus food shall be handled under sanitary conditions with verified thermal logs.',
  temperatureControl: 'Schedule 4 Part II: Hot foods shall be kept at or above 65°C and cold foods at or below 5°C.',
  timeControl: 'Codex CAC/GL 20-1995: 2-hour / 4-hour rule for perishable ready-to-eat foods.',
  allergens: 'FSSAI (Labeling and Display) Regs: Mandatory disclosure of gluten, milk, tree nuts, eggs, soy.',
};

/**
 * Assesses food safety strictly based on physical parameters and documented rules.
 * Never predicts or guarantees safety via imagery or opaque models.
 */
export function evaluateFssaiFoodSafety(params: {
  category: FoodCategory;
  storageCondition: StorageCondition;
  temperatureCelsius?: number;
  preparationTimestamp: string;
  isAllergenLabelled: boolean;
  isCleanPackaged: boolean;
}): FoodSafetyAssessment {
  const now = new Date();
  const prepDate = new Date(params.preparationTimestamp);
  const hoursSincePrep = Math.max(0, (now.getTime() - prepDate.getTime()) / (1000 * 60 * 60));

  const notes: string[] = [];
  let status: SafetyComplianceStatus = 'compliant';
  let citation = FSSAI_LEGAL_CITATIONS.generalSurplus;

  let maxHoldingHours = 4;
  let requiresColdChain = false;
  let requiresThermalTransit = false;

  // 1. Mandatory physical packaging & hygiene checks
  if (!params.isCleanPackaged) {
    status = 'rejected_unsafe';
    notes.push('Breach: Food is not sealed in food-grade, sanitized containers.');
  }

  if (!params.isAllergenLabelled) {
    notes.push('Caution: Allergen disclosures are missing. Volunteers/NGOs must audit on collection.');
    if (status !== 'rejected_unsafe') {
      status = 'incomplete_flagged';
    }
  }

  // 2. Category & Thermal Matrix
  switch (params.storageCondition) {
    case 'hot_held':
      maxHoldingHours = FSSAI_SURPLUS_RULES_CONFIG.maxHotHeldHours;
      requiresThermalTransit = true;
      citation = `${FSSAI_LEGAL_CITATIONS.temperatureControl} (Hot Holding)`;

      if (params.temperatureCelsius === undefined || isNaN(params.temperatureCelsius)) {
        notes.push('Incomplete parameter: Core temperature not logged. Must verify >= 65°C prior to pickup.');
        if (status !== 'rejected_unsafe') status = 'incomplete_flagged';
      } else if (params.temperatureCelsius < FSSAI_SURPLUS_RULES_CONFIG.minHotHoldingTempC) {
        notes.push(`Critical Hazard: Recorded ${params.temperatureCelsius}°C is below the required 65°C threshold. Danger zone multiplication risk.`);
        status = 'rejected_unsafe';
      } else {
        notes.push(`Temperature compliant: ${params.temperatureCelsius}°C (Holding standard >= 65°C).`);
      }

      if (hoursSincePrep > maxHoldingHours) {
        notes.push(`Expired: Hot holding exceeded ${maxHoldingHours} hours (${hoursSincePrep.toFixed(1)}h elapsed). Unsafe for redistribution.`);
        status = 'rejected_unsafe';
      } else if (maxHoldingHours - hoursSincePrep < 1.5) {
        notes.push(`Urgent: Only ${(maxHoldingHours - hoursSincePrep).toFixed(1)} hours remain in safe holding window.`);
        if (status === 'compliant') status = 'caution_urgent';
      }
      break;

    case 'refrigerated':
      maxHoldingHours = FSSAI_SURPLUS_RULES_CONFIG.maxRefrigeratedCookedHours;
      requiresColdChain = true;
      citation = `${FSSAI_LEGAL_CITATIONS.temperatureControl} (Cold Holding)`;

      if (params.temperatureCelsius === undefined || isNaN(params.temperatureCelsius)) {
        notes.push('Incomplete parameter: Refrigerator temperature not logged. Must confirm <= 5°C on dispatch.');
        if (status !== 'rejected_unsafe') status = 'incomplete_flagged';
      } else if (params.temperatureCelsius > FSSAI_SURPLUS_RULES_CONFIG.maxColdHoldingTempC) {
        notes.push(`Critical Hazard: Refrigerator temperature (${params.temperatureCelsius}°C) exceeds 5°C safety limit.`);
        status = 'rejected_unsafe';
      } else {
        notes.push(`Temperature compliant: ${params.temperatureCelsius}°C (Cold chain <= 5°C).`);
      }

      if (hoursSincePrep > maxHoldingHours) {
        notes.push(`Expired: Refrigerated storage exceeded ${maxHoldingHours} hours.`);
        status = 'rejected_unsafe';
      } else if (maxHoldingHours - hoursSincePrep < 6) {
        if (status === 'compliant') status = 'caution_urgent';
      }
      break;

    case 'frozen':
      maxHoldingHours = 720; // 30 days
      requiresColdChain = true;
      citation = 'FSSAI Deep Freeze Specifications: Continuous <= -18°C preservation';
      if (params.temperatureCelsius && params.temperatureCelsius > FSSAI_SURPLUS_RULES_CONFIG.maxFrozenTempC) {
        notes.push(`Warning: Frozen item temp (${params.temperatureCelsius}°C) above -18°C.`);
        if (status === 'compliant') status = 'caution_urgent';
      }
      break;

    case 'ambient':
      if (params.category === 'prepared_meals' || params.category === 'dairy_chilled') {
        maxHoldingHours = FSSAI_SURPLUS_RULES_CONFIG.maxAmbientPerishableHours;
        notes.push('High-risk: Perishable food kept at ambient room temperature. Safe limit is 2 hours.');
        if (hoursSincePrep > maxHoldingHours) {
          notes.push(`Breached ambient threshold: ${hoursSincePrep.toFixed(1)} hours elapsed. Spoilage risk.`);
          status = 'rejected_unsafe';
        } else {
          notes.push(`Urgent pickup required within ${(maxHoldingHours - hoursSincePrep).toFixed(1)} hours.`);
          if (status === 'compliant') status = 'caution_urgent';
        }
      } else if (params.category === 'bakery_grains') {
        maxHoldingHours = FSSAI_SURPLUS_RULES_CONFIG.maxBakeryShelfHours;
        notes.push('Dry bakery goods: Ambient storage compliant if sealed against pests.');
      } else {
        maxHoldingHours = FSSAI_SURPLUS_RULES_CONFIG.maxFreshProduceDays * 24;
        notes.push('Fresh uncut produce: Keep well-ventilated and dry.');
      }
      break;
  }

  const safeUntil = new Date(prepDate.getTime() + maxHoldingHours * 60 * 60 * 1000);

  return {
    storageCondition: params.storageCondition,
    temperatureCelsius: params.temperatureCelsius,
    preparationTimestamp: params.preparationTimestamp,
    safeConsumeUntil: safeUntil.toISOString(),
    hoursSincePreparation: Math.round(hoursSincePrep * 10) / 10,
    maxSafeHoldingHours: maxHoldingHours,
    fssaiRuleCitation: citation,
    isAllergenLabelled: params.isAllergenLabelled,
    isCleanPackaged: params.isCleanPackaged,
    complianceStatus: status,
    safetyNotes: notes,
    requiresColdChainTransit: requiresColdChain,
    requiresThermalTransit: requiresThermalTransit,
  };
}
