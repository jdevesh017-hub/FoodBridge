import { describe, it, expect } from 'vitest';
import { DonationStatus } from '../types';
import {
  DELIVERY_STEPS,
  getDeliveryStepInfo,
  getDeliveryRouteCoordinates,
  isValidCoordinate,
} from '../utils/deliveryStepMapping';

describe('deliveryStepMapping Utility', () => {
  const allStatuses: DonationStatus[] = [
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
    'disputed',
  ];

  it('contains exactly 4 sequential delivery steps matching requirements', () => {
    expect(DELIVERY_STEPS).toHaveLength(4);
    expect(DELIVERY_STEPS.map((s) => s.id)).toEqual([
      'reserved',
      'assigned',
      'picked_up',
      'delivered',
    ]);
  });

  it('maps every single donation status to its step index without errors', () => {
    for (const status of allStatuses) {
      const info = getDeliveryStepInfo(status);
      expect(info).toBeDefined();
      expect(typeof info.stepIndex).toBe('number');
      expect(typeof info.stepNumber).toBe('number');
      expect(typeof info.stepLabel).toBe('string');
      expect(info.stepLabel.length).toBeGreaterThan(0);
    }
  });

  it('correctly maps 4 active delivery milestone statuses', () => {
    // Step 1: Reserved
    const reservedInfo = getDeliveryStepInfo('reserved');
    expect(reservedInfo.stepIndex).toBe(0);
    expect(reservedInfo.stepNumber).toBe(1);
    expect(reservedInfo.isComplete).toBe(false);

    // Step 2: Courier Assigned & Arrived at Kitchen
    const assignedInfo = getDeliveryStepInfo('assigned');
    expect(assignedInfo.stepIndex).toBe(1);
    expect(assignedInfo.stepNumber).toBe(2);

    const arrivedInfo = getDeliveryStepInfo('arrived_at_donor');
    expect(arrivedInfo.stepIndex).toBe(1);
    expect(arrivedInfo.stepNumber).toBe(2);

    // Step 3: Picked Up / In Transit / Arrived at NGO
    const pickedUpInfo = getDeliveryStepInfo('picked_up');
    expect(pickedUpInfo.stepIndex).toBe(2);
    expect(pickedUpInfo.stepNumber).toBe(3);

    const inTransitInfo = getDeliveryStepInfo('in_transit');
    expect(inTransitInfo.stepIndex).toBe(2);
    expect(inTransitInfo.stepNumber).toBe(3);

    const awaitingInfo = getDeliveryStepInfo('awaiting_ngo_confirmation');
    expect(awaitingInfo.stepIndex).toBe(2);
    expect(awaitingInfo.stepNumber).toBe(3);

    // Step 4: Delivered
    const deliveredInfo = getDeliveryStepInfo('delivered');
    expect(deliveredInfo.stepIndex).toBe(3);
    expect(deliveredInfo.stepNumber).toBe(4);
    expect(deliveredInfo.isComplete).toBe(true);
  });

  it('handles cancellation and exception states safely', () => {
    const cancelledDonor = getDeliveryStepInfo('cancelled_by_donor');
    expect(cancelledDonor.stepIndex).toBe(-1);
    expect(cancelledDonor.isCancelled).toBe(true);

    const failed = getDeliveryStepInfo('pickup_failed');
    expect(failed.stepIndex).toBe(-1);
    expect(failed.isException).toBe(true);

    const disputed = getDeliveryStepInfo('disputed');
    expect(disputed.stepIndex).toBe(3);
    expect(disputed.isComplete).toBe(true);
    expect(disputed.isException).toBe(true);
  });

  describe('Route Coordinates Calculation', () => {
    const donorLat = 13.0827;
    const donorLng = 80.2707;
    const ngoLat = 13.0604;
    const ngoLng = 80.2496;

    it('positions courier marker dynamically according to status', () => {
      // Step 1 / 2: Courier starts at donor location
      const assignedRoute = getDeliveryRouteCoordinates(donorLat, donorLng, ngoLat, ngoLng, 'assigned');
      expect(assignedRoute).not.toBeNull();
      expect(assignedRoute?.courier).toEqual([donorLat, donorLng]);

      // Step 3: In transit courier is at midpoint
      const transitRoute = getDeliveryRouteCoordinates(donorLat, donorLng, ngoLat, ngoLng, 'picked_up');
      expect(transitRoute).not.toBeNull();
      expect(transitRoute?.courier[0]).toBeCloseTo((donorLat + ngoLat) / 2);
      expect(transitRoute?.courier[1]).toBeCloseTo((donorLng + ngoLng) / 2);

      // Step 4: Delivered courier is at NGO
      const deliveredRoute = getDeliveryRouteCoordinates(donorLat, donorLng, ngoLat, ngoLng, 'delivered');
      expect(deliveredRoute).not.toBeNull();
      expect(deliveredRoute?.courier).toEqual([ngoLat, ngoLng]);
    });

    it('does not crash on missing or invalid lat/lng and returns null', () => {
      expect(getDeliveryRouteCoordinates(undefined, donorLng, ngoLat, ngoLng, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(donorLat, undefined, ngoLat, ngoLng, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(donorLat, donorLng, undefined, ngoLng, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(donorLat, donorLng, ngoLat, undefined, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(null, null, null, null, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(0, donorLng, ngoLat, ngoLng, 'assigned')).toBeNull();
      expect(getDeliveryRouteCoordinates(NaN, donorLng, ngoLat, ngoLng, 'assigned')).toBeNull();
    });

    it('validates coordinates using isValidCoordinate', () => {
      expect(isValidCoordinate(13.0827)).toBe(true);
      expect(isValidCoordinate(-74.006)).toBe(true);
      expect(isValidCoordinate(0)).toBe(false);
      expect(isValidCoordinate(NaN)).toBe(false);
      expect(isValidCoordinate(Infinity)).toBe(false);
      expect(isValidCoordinate(undefined)).toBe(false);
      expect(isValidCoordinate('13.0827')).toBe(false);
    });
  });
});
