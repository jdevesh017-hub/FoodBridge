import { describe, it, expect, beforeEach } from 'vitest';
import { donationService } from '../services/donationService';
import { donationRepository } from '../repositories';
import { storageAdapter } from '../services/storageAdapter';
import { FoodDonation } from '../types';

describe('donationService - Role and Ownership Permissions', () => {
  const testDonationId = 'test_donation_service_001';
  const ownerDonorId = 'donor_owner_123';
  const imposterDonorId = 'donor_imposter_999';

  const createTestDonation = (id = testDonationId, donorId = ownerDonorId): FoodDonation => ({
    id,
    donorId,
    donorName: 'Test Kitchen',
    donorType: 'restaurant',
    donorAddress: '123 Test St, Mumbai',
    donorLat: 19.076,
    donorLng: 72.8777,
    donorContactPhone: '+91 98765 43210',
    foodName: 'Surplus Rice & Dal',
    foodCategory: 'prepared_meals',
    description: 'Freshly prepared vegetarian meals',
    dietaryTags: ['vegetarian'],
    quantity: {
      donorEstimatedKg: 15,
      servingsEstimate: 45,
    },
    pickupWindowStart: new Date(Date.now() + 30 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    status: 'available',
    timeline: [
      {
        status: 'available',
        timestamp: new Date().toISOString(),
        actor: 'Test Kitchen',
        note: 'Listed surplus food',
      },
    ],
    safety: {
      storageCondition: 'hot_held',
      temperatureCelsius: 65,
      temperatureUnit: 'celsius',
      preparationTimestamp: new Date().toISOString(),
      safeConsumeUntil: new Date(Date.now() + 180 * 60000).toISOString(),
      hoursSincePreparation: 1,
      maxSafeHoldingHours: 4,
      fssaiRuleCitation: 'FSSAI Guidance Note on Surplus Food Distribution 2019',
      isAllergenLabelled: true,
      isCleanPackaged: true,
      packagingCondition: 'food_grade_sealed',
      complianceStatus: 'compliant',
      assessmentOutcome: 'SUITABLE_FOR_REVIEW',
      assessmentReasons: ['Hot holding maintained above 60C'],
      warnings: [],
      missingInformation: [],
      handlingGuidance: ['Keep hot during transit'],
      safetyNotes: [],
      requiresColdChainTransit: false,
      requiresThermalTransit: true,
      assessedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    origin: 'user_created',
  });

  beforeEach(() => {
    storageAdapter.resetAll();
    donationRepository.create(createTestDonation());
  });

  describe('updateDonation', () => {
    const validUpdateParams = {
      foodName: 'Updated Rice & Dal',
      foodCategory: 'prepared_meals' as const,
      description: 'Updated description',
      dietaryTags: ['vegetarian' as const],
      donorEstimatedKg: 20,
      storageCondition: 'hot_held' as const,
      preparationTimestamp: new Date().toISOString(),
      isAllergenLabelled: true,
      isCleanPackaged: true,
      pickupWindowStart: new Date(Date.now() + 30 * 60000).toISOString(),
      pickupWindowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    };

    it('rejects update if actorRole is not donor', () => {
      const resNgo = donationService.updateDonation(testDonationId, ownerDonorId, validUpdateParams, 'ngo');
      expect(resNgo.success).toBe(false);
      expect(resNgo.error).toContain('Only donors can edit surplus listings');

      const resVol = donationService.updateDonation(testDonationId, ownerDonorId, validUpdateParams, 'volunteer');
      expect(resVol.success).toBe(false);
      expect(resVol.error).toContain('Only donors can edit surplus listings');
    });

    it('rejects update if actorId does not match owner donorId', () => {
      const res = donationService.updateDonation(testDonationId, imposterDonorId, validUpdateParams, 'donor');
      expect(res.success).toBe(false);
      expect(res.error).toContain('You can only edit your own donation listings');
    });

    it('allows update when actorRole is donor and actorId matches owner donorId', () => {
      const res = donationService.updateDonation(testDonationId, ownerDonorId, validUpdateParams, 'donor');
      expect(res.success).toBe(true);
      expect(res.donation?.foodName).toBe('Updated Rice & Dal');
    });
  });

  describe('cancelDonationByDonor', () => {
    it('rejects cancellation if actorRole is not donor', () => {
      const resNgo = donationService.cancelDonationByDonor(testDonationId, ownerDonorId, 'No longer available', 'ngo');
      expect(resNgo.success).toBe(false);
      expect(resNgo.error).toContain('Only the listing donor can cancel this surplus lot');

      const resVol = donationService.cancelDonationByDonor(testDonationId, ownerDonorId, 'No longer available', 'volunteer');
      expect(resVol.success).toBe(false);
      expect(resVol.error).toContain('Only the listing donor can cancel this surplus lot');
    });

    it('rejects cancellation if actorId does not match owner donorId', () => {
      const res = donationService.cancelDonationByDonor(testDonationId, imposterDonorId, 'No longer available', 'donor');
      expect(res.success).toBe(false);
      expect(res.error).toContain('You can only cancel your own donation listings');
    });

    it('allows cancellation when actorRole is donor and actorId matches owner donorId', () => {
      const res = donationService.cancelDonationByDonor(testDonationId, ownerDonorId, 'Surplus lot no longer needed', 'donor');
      expect(res.success).toBe(true);

      const updated = donationRepository.findById(testDonationId);
      expect(updated?.status).toBe('cancelled_by_donor');
    });
  });
});
