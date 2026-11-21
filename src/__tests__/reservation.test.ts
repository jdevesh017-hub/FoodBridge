import { describe, it, expect, beforeEach } from 'vitest';
import { donationRepository, reservationRepository } from '../repositories';
import { storageAdapter } from '../services/storageAdapter';
import { FoodDonation } from '../types';

describe('Reservation System & Atomic Locking', () => {
  const testDonationId = 'test_donation_res_101';
  const testNgoA = {
    id: 'ngo_alpha_aid',
    name: 'Alpha Food Kitchen',
    address: '100 Marine Lines, Mumbai',
    lat: 18.9438,
    lng: 72.8232,
  };
  const testNgoB = {
    id: 'ngo_beta_relief',
    name: 'Beta Relief Foundation',
    address: '200 Dadar West, Mumbai',
    lat: 19.0178,
    lng: 72.8478,
  };

  const createAvailableTestDonation = (id = testDonationId): FoodDonation => ({
    id,
    donorId: 'donor_taj',
    donorName: 'The Taj Mahal Palace',
    donorType: 'hotel',
    donorAddress: 'Apollo Bunder, Colaba, Mumbai',
    donorLat: 18.9217,
    donorLng: 72.8332,
    donorContactPhone: '+91 22 6665 3366',
    foodName: 'Paneer Butter Masala & Naan',
    foodCategory: 'prepared_meals',
    description: 'Fresh banquet surplus packed in food-grade thermal containers',
    dietaryTags: ['vegetarian'],
    quantity: {
      donorEstimatedKg: 20,
      servingsEstimate: 55,
    },
    pickupWindowStart: new Date(Date.now() + 30 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    status: 'available',
    timeline: [
      {
        status: 'available',
        timestamp: new Date().toISOString(),
        actor: 'The Taj Mahal Palace',
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
      handlingGuidance: ['Keep in thermal carrier until delivery'],
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
    // Insert fresh test donation
    donationRepository.create(createAvailableTestDonation());
  });

  describe('Acquiring a reservation lease lock', () => {
    it('successfully acquires a lease lock on an available donation', () => {
      const lockRes = reservationRepository.acquireLock(testDonationId, testNgoA.id, 90);
      expect(lockRes.success).toBe(true);

      const donation = donationRepository.findById(testDonationId);
      expect(donation?.reservationLock).toBeDefined();
      expect(donation?.reservationLock?.leaseHolderId).toBe(testNgoA.id);
      expect(new Date(donation!.reservationLock!.lockExpiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects acquiring lock if donation does not exist', () => {
      const lockRes = reservationRepository.acquireLock('non_existent_id', testNgoA.id);
      expect(lockRes.success).toBe(false);
      expect(lockRes.error).toContain('Donation not found');
    });

    it('blocks a second NGO while an active unexpired lease is held by another NGO', () => {
      // NGO A acquires lock for 90 seconds
      reservationRepository.acquireLock(testDonationId, testNgoA.id, 90);

      // NGO B tries to acquire lock on the same donation
      const secondLockRes = reservationRepository.acquireLock(testDonationId, testNgoB.id, 90);
      expect(secondLockRes.success).toBe(false);
      expect(secondLockRes.error).toContain('lease hold expires in');
    });

    it('allows lock re-entry or extension by the same lease holder', () => {
      reservationRepository.acquireLock(testDonationId, testNgoA.id, 90);
      const reLockRes = reservationRepository.acquireLock(testDonationId, testNgoA.id, 120);
      expect(reLockRes.success).toBe(true);
    });

    it('allows another NGO to acquire lock if previous lease has expired', () => {
      // Manually set an expired lock held by NGO A
      const donation = donationRepository.findById(testDonationId)!;
      donation.reservationLock = {
        lockedAt: new Date(Date.now() - 120000).toISOString(),
        lockExpiresAt: new Date(Date.now() - 30000).toISOString(), // expired 30s ago
        leaseHolderId: testNgoA.id,
      };
      donationRepository.update(testDonationId, { reservationLock: donation.reservationLock });

      // NGO B now attempts to acquire the lock
      const lockRes = reservationRepository.acquireLock(testDonationId, testNgoB.id, 90);
      expect(lockRes.success).toBe(true);

      const updated = donationRepository.findById(testDonationId);
      expect(updated?.reservationLock?.leaseHolderId).toBe(testNgoB.id);
    });
  });

  describe('Confirming a reservation', () => {
    it('successfully confirms reservation, transitions status to reserved, and releases the lock', () => {
      // Acquire lock first
      reservationRepository.acquireLock(testDonationId, testNgoA.id, 90);

      // Confirm reservation
      const confirmRes = reservationRepository.confirmReservation(testDonationId, testNgoA);
      expect(confirmRes.success).toBe(true);
      expect(confirmRes.donation?.status).toBe('reserved');
      expect(confirmRes.donation?.reservedByNgoId).toBe(testNgoA.id);
      expect(confirmRes.donation?.reservedByNgoName).toBe(testNgoA.name);
      expect(confirmRes.donation?.ngoAddress).toBe(testNgoA.address);
      expect(confirmRes.donation?.reservationLock).toBeUndefined(); // Lock cleared

      // Verify in persistence repository
      const saved = donationRepository.findById(testDonationId);
      expect(saved?.status).toBe('reserved');
      expect(saved?.reservedByNgoId).toBe(testNgoA.id);
    });

    it('prevents another NGO from confirming a reservation while lock is held by a different NGO', () => {
      reservationRepository.acquireLock(testDonationId, testNgoA.id, 90);

      const unauthorizedConfirm = reservationRepository.confirmReservation(testDonationId, testNgoB);
      expect(unauthorizedConfirm.success).toBe(false);
      expect(unauthorizedConfirm.error).toContain('Reservation lock is currently held by another organization');
    });

    it('prevents double-booking / duplicate claims on an already reserved donation', () => {
      // Complete first reservation
      reservationRepository.confirmReservation(testDonationId, testNgoA);

      // Attempt second reservation by NGO B
      const duplicateRes = reservationRepository.confirmReservation(testDonationId, testNgoB);
      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain('Cannot complete reservation: Donation status is \'reserved\'');
    });
  });

  describe('Releasing a reservation', () => {
    it('releases a reserved donation back to available pool and clears reservation metadata', () => {
      // First reserve
      reservationRepository.confirmReservation(testDonationId, testNgoA);

      // Then release
      const releaseRes = reservationRepository.releaseReservation(testDonationId, testNgoA.id, testNgoA.name);
      expect(releaseRes.success).toBe(true);

      const released = donationRepository.findById(testDonationId);
      expect(released?.status).toBe('available');
      expect(released?.reservedByNgoId).toBeUndefined();
      expect(released?.reservedByNgoName).toBeUndefined();
      expect(released?.assignedVolunteerId).toBeUndefined();
      expect(released?.timeline.some((t) => t.status === 'available')).toBe(true);
    });

    it('rejects releasing a donation that is not in a releasable status (e.g. delivered)', () => {
      donationRepository.update(testDonationId, { status: 'delivered', reservedByNgoId: testNgoA.id });

      const releaseRes = reservationRepository.releaseReservation(testDonationId, testNgoA.id, testNgoA.name);
      expect(releaseRes.success).toBe(false);
      expect(releaseRes.error).toContain('Terminal state reached');
    });
  });
});
