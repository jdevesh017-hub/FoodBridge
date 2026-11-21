import { describe, it, expect, beforeEach } from 'vitest';
import { deliveryRepository, donationRepository } from '../repositories';
import { storageAdapter } from '../services/storageAdapter';
import { FoodDonation } from '../types';

describe('Delivery Repository & Courier Workflow', () => {
  const testDonationId = 'test_delivery_don_201';
  const testNgo = {
    id: 'ngo_hope_kitchen',
    name: 'Hope Community Kitchen',
    address: '42 Byculla Station Road, Mumbai',
    lat: 19.062,
    lng: 72.855,
  };
  const testVolunteerA = {
    id: 'vol_alex_rider',
    name: 'Alex Rider',
    phone: '+91 98200 11223',
  };
  const testVolunteerB = {
    id: 'vol_wrong_actor',
    name: 'Imposter Courier',
    phone: '+91 98200 99999',
  };
  const wrongNgo = {
    id: 'ngo_unauthorized_charity',
    name: 'Unauthorized Charity',
  };

  const createReservedTestDonation = (id = testDonationId): FoodDonation => ({
    id,
    origin: 'user_created',
    donorId: 'donor_grand_meridian',
    donorName: 'Grand Meridian Hotel',
    donorType: 'hotel',
    donorAddress: 'Juhu Tara Road, Mumbai',
    donorLat: 19.0988,
    donorLng: 72.8267,
    donorContactPhone: '+91 22 2618 4000',
    foodName: 'Mixed Dal Tadka & Jeera Rice',
    foodCategory: 'prepared_meals',
    description: 'Fresh lunch buffet surplus packed in insulated containers',
    dietaryTags: ['vegetarian'],
    quantity: {
      donorEstimatedKg: 25,
      servingsEstimate: 70,
    },
    pickupWindowStart: new Date(Date.now() + 30 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    status: 'reserved',
    reservedByNgoId: testNgo.id,
    reservedByNgoName: testNgo.name,
    ngoAddress: testNgo.address,
    ngoLat: testNgo.lat,
    ngoLng: testNgo.lng,
    timeline: [
      {
        status: 'available',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        actor: 'Grand Meridian Hotel',
        note: 'Listed surplus food',
      },
      {
        status: 'reserved',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        actor: testNgo.name,
        note: 'Reserved by NGO',
      },
    ],
    safety: {
      storageCondition: 'hot_held',
      temperatureCelsius: 68,
      temperatureUnit: 'celsius',
      preparationTimestamp: new Date(Date.now() - 7200000).toISOString(),
      safeConsumeUntil: new Date(Date.now() + 14400000).toISOString(),
      hoursSincePreparation: 2,
      maxSafeHoldingHours: 6,
      fssaiRuleCitation: 'FSSAI Guidance Note on Surplus Food Distribution 2019',
      isAllergenLabelled: true,
      isCleanPackaged: true,
      packagingCondition: 'food_grade_sealed',
      complianceStatus: 'compliant',
      assessmentOutcome: 'SUITABLE_FOR_REVIEW',
      assessmentReasons: ['Hot holding maintained at 68C'],
      warnings: [],
      missingInformation: [],
      handlingGuidance: ['Keep insulated during transport'],
      safetyNotes: [],
      requiresColdChainTransit: false,
      requiresThermalTransit: true,
      assessedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  });

  beforeEach(() => {
    storageAdapter.resetAll();
    donationRepository.create(createReservedTestDonation());
  });

  describe('acceptTask', () => {
    it('allows a volunteer courier to accept an available reserved task', () => {
      const res = deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      expect(res.success).toBe(true);
      expect(res.donation?.status).toBe('assigned');
      expect(res.donation?.assignedVolunteerId).toBe(testVolunteerA.id);
      expect(res.donation?.assignedVolunteerName).toBe(testVolunteerA.name);

      const activeList = deliveryRepository.getMyActiveDeliveries(testVolunteerA.id);
      expect(activeList.some((d) => d.id === testDonationId)).toBe(true);
    });

    it('rejects duplicate acceptance if already assigned to a courier', () => {
      deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      const duplicateRes = deliveryRepository.acceptTask(testDonationId, testVolunteerB);
      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain('not available for assignment');
    });
  });

  describe('Actor ownership enforcement', () => {
    it('prevents a wrong volunteer from confirming pickup', () => {
      // Assign to volunteer A
      deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      deliveryRepository.confirmArrivalAtDonor(testDonationId, testVolunteerA.id, testVolunteerA.name);

      // Volunteer B attempts pickup confirmation
      const wrongVolunteerRes = deliveryRepository.confirmPickup(
        testDonationId,
        testVolunteerB.id,
        testVolunteerB.name,
        25
      );
      expect(wrongVolunteerRes.success).toBe(false);
      expect(wrongVolunteerRes.error).toContain('Only the assigned courier can confirm pickup');

      // Verify status was not altered
      const item = donationRepository.findById(testDonationId);
      expect(item?.status).toBe('arrived_at_donor');
    });

    it('prevents a wrong NGO from confirming receipt', () => {
      // Progress to awaiting NGO confirmation
      deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      deliveryRepository.confirmArrivalAtDonor(testDonationId, testVolunteerA.id, testVolunteerA.name);
      deliveryRepository.confirmPickup(testDonationId, testVolunteerA.id, testVolunteerA.name, 25);
      deliveryRepository.confirmArrivalAtNgo(testDonationId, testVolunteerA.id, testVolunteerA.name);

      // Wrong NGO attempts confirmation
      const unauthorizedRes = deliveryRepository.confirmReceipt(
        testDonationId,
        wrongNgo.id,
        wrongNgo.name,
        {
          receivedKg: 25,
          receivingSupervisorName: 'Intruder Staff',
        }
      );
      expect(unauthorizedRes.success).toBe(false);
      expect(unauthorizedRes.error).toContain('Only the organization that reserved this batch can sign off on receipt');

      // Verify status was not altered
      const item = donationRepository.findById(testDonationId);
      expect(item?.status).toBe('awaiting_ngo_confirmation');
    });

    it('rejects reporting a discrepancy on an already delivered donation', () => {
      // Complete delivery happy path
      deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      deliveryRepository.confirmArrivalAtDonor(testDonationId, testVolunteerA.id, testVolunteerA.name);
      deliveryRepository.confirmPickup(testDonationId, testVolunteerA.id, testVolunteerA.name, 25);
      deliveryRepository.confirmArrivalAtNgo(testDonationId, testVolunteerA.id, testVolunteerA.name);
      deliveryRepository.confirmReceipt(testDonationId, testNgo.id, testNgo.name, {
        receivedKg: 25,
        receivingSupervisorName: 'Supervisor Sister Mary',
      });

      // Attempt to report discrepancy after delivery verification
      const discrepancyRes = deliveryRepository.reportDiscrepancy(testDonationId, {
        reportedAt: new Date().toISOString(),
        reportedByRole: 'ngo',
        reporterName: testNgo.name,
        issueType: 'quantity_mismatch',
        details: 'Attempting to flag discrepancy after final delivery confirmation',
      });

      expect(discrepancyRes.success).toBe(false);
      expect(discrepancyRes.error).toBeDefined();
    });
  });

  describe('Full happy path: from reserved to delivered', () => {
    it('successfully progresses sequentially through all stages and issues impact receipt', () => {
      // 1. Initial status is reserved
      let donation = donationRepository.findById(testDonationId)!;
      expect(donation.status).toBe('reserved');

      // 2. Courier accepts task
      const acceptRes = deliveryRepository.acceptTask(testDonationId, testVolunteerA);
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.donation?.status).toBe('assigned');

      // 3. Courier arrives at donor premises
      const arrivalDonorRes = deliveryRepository.confirmArrivalAtDonor(
        testDonationId,
        testVolunteerA.id,
        testVolunteerA.name
      );
      expect(arrivalDonorRes.success).toBe(true);
      donation = donationRepository.findById(testDonationId)!;
      expect(donation.status).toBe('arrived_at_donor');

      // 4. Courier confirms physical pickup & net weight
      const pickupRes = deliveryRepository.confirmPickup(
        testDonationId,
        testVolunteerA.id,
        testVolunteerA.name,
        24.5,
        'Loaded in thermal insulated carrier'
      );
      expect(pickupRes.success).toBe(true);
      expect(pickupRes.donation?.status).toBe('picked_up');
      expect(pickupRes.donation?.quantity.pickupConfirmedKg).toBe(24.5);

      // 5. Courier arrives at NGO shelter
      const arrivalNgoRes = deliveryRepository.confirmArrivalAtNgo(
        testDonationId,
        testVolunteerA.id,
        testVolunteerA.name,
        'Handed boxes over to kitchen manager'
      );
      expect(arrivalNgoRes.success).toBe(true);
      expect(arrivalNgoRes.donation?.status).toBe('awaiting_ngo_confirmation');

      // 6. NGO confirms receipt and signs off intake
      const receiptRes = deliveryRepository.confirmReceipt(testDonationId, testNgo.id, testNgo.name, {
        receivedKg: 24.5,
        receivingSupervisorName: 'Sister Teresa',
        notes: 'Temperature tested at 64C upon delivery. Excellent condition.',
      });
      expect(receiptRes.success).toBe(true);
      expect(receiptRes.donation?.status).toBe('delivered');
      expect(receiptRes.donation?.quantity.deliveredKg).toBe(24.5);
      expect(receiptRes.donation?.quantity.discrepancyKg).toBe(0);

      // Verify Impact Receipt
      const receipt = receiptRes.donation?.impactReceipt;
      expect(receipt).toBeDefined();
      expect(receipt?.deliveredKg).toBe(24.5);
      expect(receipt?.mealsProvided).toBe(Math.round(24.5 / 0.35));
      expect(receipt?.ngoName).toBe(testNgo.name);
      expect(receipt?.donorName).toBe(donation.donorName);

      // 7. Verify history reflects completed delivery
      const history = deliveryRepository.getMyDeliveryHistory(testVolunteerA.id);
      expect(history.some((d) => d.id === testDonationId)).toBe(true);

      const activeAfter = deliveryRepository.getMyActiveDeliveries(testVolunteerA.id);
      expect(activeAfter.some((d) => d.id === testDonationId)).toBe(false);
    });
  });
});
