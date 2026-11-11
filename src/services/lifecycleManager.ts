/**
 * FoodBridge Donation & Delivery Lifecycle Manager
 * Enforces strict, deterministic state transitions and role/ownership authorization.
 *
 * Prevents invalid state jumps (e.g. reserving a delivered item, completing delivery without pickup)
 * and guards against unauthorized actions.
 */

import { DonationStatus, UserRole } from '../types';

export const VALID_LIFECYCLE_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  available: ['reserved', 'cancelled_by_donor'],
  locking: ['available', 'reserved'],
  reserved: ['assigned', 'available', 'cancelled_by_donor', 'cancelled_by_ngo'],
  assigned: ['arrived_at_donor', 'reserved', 'volunteer_cancelled', 'cancelled_by_donor'],
  arrived_at_donor: ['picked_up', 'pickup_failed', 'reserved', 'volunteer_cancelled'],
  picked_up: ['in_transit', 'awaiting_ngo_confirmation', 'delivered', 'delivery_issue'],
  in_transit: ['awaiting_ngo_confirmation', 'delivered', 'delivery_issue'],
  awaiting_ngo_confirmation: ['delivered', 'disputed', 'delivery_issue'],
  delivered: [], // Terminal verified state
  cancelled_by_donor: [], // Terminal cancelled state
  cancelled_by_ngo: ['available'], // Released back to available discovery pool
  volunteer_cancelled: ['reserved'], // Released back to volunteer task dispatch pool
  pickup_failed: ['available', 'cancelled_by_donor'], // Can be re-listed after packaging adjustment or cancelled
  delivery_issue: ['disputed', 'delivered'], // Pending dispute or final sign-off
  disputed: ['delivered', 'cancelled_by_donor'], // Discrepancy resolved or cancelled
};

export class LifecycleManager {
  /**
   * Validates if a transition from currentStatus to nextStatus is permitted.
   */
  public static validateTransition(
    currentStatus: DonationStatus,
    nextStatus: DonationStatus
  ): { allowed: boolean; error?: string } {
    // Terminal states cannot transition to anything, including themselves
    if (['delivered', 'cancelled_by_donor'].includes(currentStatus)) {
      return {
        allowed: false,
        error: `Terminal state reached: Donation status '${currentStatus}' is final and cannot be modified or re-executed.`,
      };
    }

    if (currentStatus === nextStatus) {
      return { allowed: true };
    }

    const allowedNext = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      return {
        allowed: false,
        error: `Invalid lifecycle transition: Cannot move donation from '${currentStatus.replace(/_/g, ' ')}' to '${nextStatus.replace(/_/g, ' ')}'. Permitted next states: [${allowedNext.map((s) => s.replace(/_/g, ' ')).join(', ')}].`,
      };
    }

    return { allowed: true };
  }

  /**
   * Enforces role and ownership checks for critical workflow actions.
   */
  public static validateRolePermission(
    action:
      | 'create_donation'
      | 'edit_donation'
      | 'cancel_donation'
      | 'reserve_donation'
      | 'release_reservation'
      | 'accept_task'
      | 'confirm_pickup'
      | 'confirm_receipt'
      | 'report_issue',
    actorRole: UserRole,
    context?: {
      ownerId?: string;
      actorId?: string;
      assignedCourierId?: string;
      reservingNgoId?: string;
    }
  ): { allowed: boolean; error?: string } {
    switch (action) {
      case 'create_donation':
        if (actorRole !== 'donor') {
          return { allowed: false, error: 'Unauthorized: Only registered food donors can list surplus food.' };
        }
        return { allowed: true };

      case 'edit_donation':
        if (actorRole !== 'donor') {
          return { allowed: false, error: 'Unauthorized: Only donors can edit surplus listings.' };
        }
        if (context?.ownerId && context?.actorId && context.ownerId !== context.actorId) {
          return { allowed: false, error: 'Unauthorized: You can only edit your own donation listings.' };
        }
        return { allowed: true };

      case 'cancel_donation':
        if (actorRole !== 'donor') {
          return { allowed: false, error: 'Unauthorized: Only the listing donor can cancel this surplus lot.' };
        }
        if (context?.ownerId && context?.actorId && context.ownerId !== context.actorId) {
          return { allowed: false, error: 'Unauthorized: You can only cancel your own donation listings.' };
        }
        return { allowed: true };

      case 'reserve_donation':
      case 'release_reservation':
        if (actorRole !== 'ngo') {
          return { allowed: false, error: 'Unauthorized: Only verified NGOs and community kitchens can reserve surplus food.' };
        }
        if (action === 'release_reservation' && context?.reservingNgoId && context?.actorId) {
          if (context.reservingNgoId !== context.actorId) {
            return { allowed: false, error: 'Unauthorized: You can only release reservations claimed by your own organization.' };
          }
        }
        return { allowed: true };

      case 'accept_task':
        if (actorRole !== 'volunteer') {
          return { allowed: false, error: 'Unauthorized: Only registered delivery partners can accept pickup routes.' };
        }
        return { allowed: true };

      case 'confirm_pickup':
        if (actorRole !== 'volunteer') {
          return { allowed: false, error: 'Unauthorized: Only delivery partners can confirm food collection.' };
        }
        if (context?.assignedCourierId && context?.actorId) {
          if (context.assignedCourierId !== context.actorId) {
            return { allowed: false, error: 'Unauthorized: Only the assigned courier can confirm pickup for this task.' };
          }
        }
        return { allowed: true };

      case 'confirm_receipt':
        if (actorRole !== 'ngo') {
          return { allowed: false, error: 'Unauthorized: Only the receiving NGO dining hall supervisor can confirm receipt of food.' };
        }
        if (context?.reservingNgoId && context?.actorId) {
          if (context.reservingNgoId !== context.actorId) {
            return { allowed: false, error: 'Unauthorized: Only the organization that reserved this batch can sign off on receipt.' };
          }
        }
        return { allowed: true };

      case 'report_issue':
        if (actorRole !== 'ngo' && actorRole !== 'volunteer' && actorRole !== 'donor') {
          return { allowed: false, error: 'Unauthorized: Invalid role for reporting delivery discrepancies.' };
        }
        return { allowed: true };
    }
  }
}
