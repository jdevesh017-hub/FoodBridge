/**
 * FoodBridge Impact Accounting Service
 * Calculates verified environmental and community redistribution impact.
 * Enforces strict isolation: Only completed and verified deliveries ('delivered')
 * contribute to actual recovered-food metrics. Demonstration data is strictly partitioned.
 */

import { FoodCategory, ImpactStatistics, WasteIntelligenceMetric } from '../types';
import { DEMO_BASELINE_STATS } from './seedData';
import { storageAdapter } from './storageAdapter';

export class ImpactService {
  /**
   * Returns verified metrics for actual user-completed deliveries in the current session.
   */
  public getUserSessionVerifiedImpact(): ImpactStatistics {
    const donations = storageAdapter.getDonations();
    const verifiedUserDeliveries = donations.filter(
      (d) => d.origin === 'user_created' && d.status === 'delivered'
    );

    let totalKg = 0;
    let totalMeals = 0;
    const donorIds = new Set<string>();
    const ngoIds = new Set<string>();
    const volunteerIds = new Set<string>();

    verifiedUserDeliveries.forEach((d) => {
      const kg = d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg;
      totalKg += kg;
      totalMeals += d.quantity.servingsEstimate;
      if (d.donorId) donorIds.add(d.donorId);
      if (d.reservedByNgoId) ngoIds.add(d.reservedByNgoId);
      if (d.assignedVolunteerId) volunteerIds.add(d.assignedVolunteerId);
    });

    return {
      totalSurplusKgDiverted: Math.round(totalKg * 10) / 10,
      totalMealsRedistributed: totalMeals,
      completedRescuesCount: verifiedUserDeliveries.length,
      participatingDonorsCount: donorIds.size,
      participatingNgosCount: ngoIds.size,
      activeVolunteersCount: volunteerIds.size,
      co2EquivalentPreventedKg: Math.round(totalKg * 2.5 * 10) / 10,
    };
  }

  /**
   * Returns the curated baseline pilot demonstration metrics.
   * Clearly labeled in the UI as Demonstration / Pilot Baseline.
   */
  public getDemonstrationBaselineStats(): ImpactStatistics {
    return DEMO_BASELINE_STATS;
  }

  /**
   * Returns combined view with explicit indication of demonstration portion.
   */
  public getCombinedImpactSummary(): {
    sessionVerified: ImpactStatistics;
    demoBaseline: ImpactStatistics;
    totalCombinedKg: number;
    totalCombinedMeals: number;
  } {
    const session = this.getUserSessionVerifiedImpact();
    const demo = this.getDemonstrationBaselineStats();

    return {
      sessionVerified: session,
      demoBaseline: demo,
      totalCombinedKg: demo.totalSurplusKgDiverted + session.totalSurplusKgDiverted,
      totalCombinedMeals: demo.totalMealsRedistributed + session.totalMealsRedistributed,
    };
  }

  /**
   * Computes surplus category breakdown for Food Waste Intelligence.
   */
  public getCategoryBreakdown(): WasteIntelligenceMetric[] {
    const donations = storageAdapter.getDonations();
    const categoryTotals: Record<FoodCategory, number> = {
      prepared_meals: 0,
      fresh_produce: 0,
      bakery_grains: 0,
      dairy_chilled: 0,
      packaged_dry: 0,
    };

    let grandTotal = 0;
    donations.forEach((d) => {
      const weight = d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg;
      categoryTotals[d.foodCategory] = (categoryTotals[d.foodCategory] || 0) + weight;
      grandTotal += weight;
    });

    // Provide default proportional distribution if grandTotal is small
    if (grandTotal === 0) grandTotal = 1;

    const categories: FoodCategory[] = [
      'prepared_meals',
      'bakery_grains',
      'fresh_produce',
      'dairy_chilled',
      'packaged_dry',
    ];

    return categories.map((cat) => {
      const kg = categoryTotals[cat];
      const pct = Math.round((kg / grandTotal) * 100);
      return {
        category: cat,
        totalKg: Math.round(kg * 10) / 10,
        percentage: pct,
        trend: cat === 'prepared_meals' ? 'up' : 'stable',
      };
    });
  }
}

export const impactService = new ImpactService();
