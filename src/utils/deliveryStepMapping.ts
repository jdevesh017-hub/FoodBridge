import { DonationStatus } from '../types';

export interface DeliveryStepDef {
  id: string;
  label: string;
  shortLabel: string;
}

/**
 * 4 standard delivery lifecycle states required by FoodBridge
 */
export const DELIVERY_STEPS: readonly DeliveryStepDef[] = [
  { id: 'reserved', label: 'Reserved', shortLabel: 'Reserved' },
  { id: 'assigned', label: 'Courier Assigned', shortLabel: 'Assigned' },
  { id: 'picked_up', label: 'Picked Up', shortLabel: 'Picked Up' },
  { id: 'delivered', label: 'Delivered', shortLabel: 'Delivered' },
] as const;

export interface DeliveryStepInfo {
  stepIndex: number; // 0..3 for active delivery steps; -1 for pre-reservation or cancelled
  stepNumber: number; // 1-based (1..4) or 0
  stepLabel: string;
  isComplete: boolean;
  isCancelled: boolean;
  isException: boolean;
  courierLocationPhase: 'donor' | 'midpoint' | 'ngo' | null;
}

/**
 * Pure function mapping any DonationStatus to its corresponding delivery step.
 * Fully type-safe and handles every single DonationStatus variant.
 */
export function getDeliveryStepInfo(status: DonationStatus): DeliveryStepInfo {
  switch (status) {
    case 'available':
    case 'locking':
      return {
        stepIndex: -1,
        stepNumber: 0,
        stepLabel: 'Available for NGO Claim',
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: null,
      };

    case 'reserved':
      return {
        stepIndex: 0,
        stepNumber: 1,
        stepLabel: 'Reserved (Awaiting Courier)',
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: 'donor',
      };

    case 'assigned':
    case 'arrived_at_donor':
      return {
        stepIndex: 1,
        stepNumber: 2,
        stepLabel: 'Courier Assigned',
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: 'donor',
      };

    case 'picked_up':
    case 'in_transit':
      return {
        stepIndex: 2,
        stepNumber: 3,
        stepLabel: 'Picked Up (In Transit)',
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: 'midpoint',
      };

    case 'awaiting_ngo_confirmation':
      return {
        stepIndex: 2,
        stepNumber: 3,
        stepLabel: 'Arrived at Facility (Awaiting Sign-Off)',
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: 'ngo',
      };

    case 'delivered':
      return {
        stepIndex: 3,
        stepNumber: 4,
        stepLabel: 'Delivered & Verified',
        isComplete: true,
        isCancelled: false,
        isException: false,
        courierLocationPhase: 'ngo',
      };

    case 'cancelled_by_donor':
    case 'cancelled_by_ngo':
    case 'volunteer_cancelled':
      return {
        stepIndex: -1,
        stepNumber: 0,
        stepLabel: 'Delivery Cancelled',
        isComplete: false,
        isCancelled: true,
        isException: true,
        courierLocationPhase: null,
      };

    case 'pickup_failed':
    case 'delivery_issue':
      return {
        stepIndex: -1,
        stepNumber: 0,
        stepLabel: 'Delivery Incident Reported',
        isComplete: false,
        isCancelled: false,
        isException: true,
        courierLocationPhase: null,
      };

    case 'disputed':
      return {
        stepIndex: 3,
        stepNumber: 4,
        stepLabel: 'Delivered (Discrepancy Logged)',
        isComplete: true,
        isCancelled: false,
        isException: true,
        courierLocationPhase: 'ngo',
      };

    default: {
      const _exhaustiveCheck: never = status;
      return {
        stepIndex: -1,
        stepNumber: 0,
        stepLabel: String(_exhaustiveCheck),
        isComplete: false,
        isCancelled: false,
        isException: false,
        courierLocationPhase: null,
      };
    }
  }
}

/**
 * Validates whether a numerical coordinate is safe and valid (non-zero, finite).
 */
export function isValidCoordinate(coord: unknown): coord is number {
  return typeof coord === 'number' && !Number.isNaN(coord) && Number.isFinite(coord) && coord !== 0;
}

export interface RouteCoordinates {
  donor: [number, number];
  ngo: [number, number];
  courier: [number, number];
}

/**
 * Calculates donor, NGO, and dynamic courier positions based on status.
 * Returns null if coordinates on either side are missing or invalid,
 * preventing any invented or fake coordinates.
 */
export function getDeliveryRouteCoordinates(
  donorLat: number | undefined | null,
  donorLng: number | undefined | null,
  ngoLat: number | undefined | null,
  ngoLng: number | undefined | null,
  status: DonationStatus
): RouteCoordinates | null {
  if (
    !isValidCoordinate(donorLat) ||
    !isValidCoordinate(donorLng) ||
    !isValidCoordinate(ngoLat) ||
    !isValidCoordinate(ngoLng)
  ) {
    return null;
  }

  const donor: [number, number] = [donorLat, donorLng];
  const ngo: [number, number] = [ngoLat, ngoLng];
  const stepInfo = getDeliveryStepInfo(status);

  let courier: [number, number];
  switch (stepInfo.courierLocationPhase) {
    case 'donor':
      courier = donor;
      break;
    case 'midpoint':
      courier = [(donorLat + ngoLat) / 2, (donorLng + ngoLng) / 2];
      break;
    case 'ngo':
      courier = ngo;
      break;
    default:
      courier = donor;
  }

  return { donor, ngo, courier };
}
