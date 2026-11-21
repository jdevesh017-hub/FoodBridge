import { describe, it, expect } from 'vitest';
import { LifecycleManager, VALID_LIFECYCLE_TRANSITIONS } from '../services/lifecycleManager';
import { DonationStatus } from '../types';

describe('LifecycleManager', () => {
  describe('validateTransition - Normal valid lifecycle paths', () => {
    it('allows complete sequential delivery progression', () => {
      // available -> reserved
      expect(LifecycleManager.validateTransition('available', 'reserved').allowed).toBe(true);
      // reserved -> assigned
      expect(LifecycleManager.validateTransition('reserved', 'assigned').allowed).toBe(true);
      // assigned -> arrived_at_donor
      expect(LifecycleManager.validateTransition('assigned', 'arrived_at_donor').allowed).toBe(true);
      // arrived_at_donor -> picked_up
      expect(LifecycleManager.validateTransition('arrived_at_donor', 'picked_up').allowed).toBe(true);
      // picked_up -> awaiting_ngo_confirmation
      expect(LifecycleManager.validateTransition('picked_up', 'awaiting_ngo_confirmation').allowed).toBe(true);
      // awaiting_ngo_confirmation -> delivered
      expect(LifecycleManager.validateTransition('awaiting_ngo_confirmation', 'delivered').allowed).toBe(true);
    });

    it('allows volunteer cancellation recovery flow', () => {
      // assigned -> volunteer_cancelled
      expect(LifecycleManager.validateTransition('assigned', 'volunteer_cancelled').allowed).toBe(true);
      // volunteer_cancelled -> reserved (returned to dispatch pool)
      expect(LifecycleManager.validateTransition('volunteer_cancelled', 'reserved').allowed).toBe(true);
    });

    it('allows dispute and discrepancy resolution paths', () => {
      // picked_up -> disputed
      expect(LifecycleManager.validateTransition('picked_up', 'disputed').allowed).toBe(true);
      // awaiting_ngo_confirmation -> disputed
      expect(LifecycleManager.validateTransition('awaiting_ngo_confirmation', 'disputed').allowed).toBe(true);
      // disputed -> delivered (resolved)
      expect(LifecycleManager.validateTransition('disputed', 'delivered').allowed).toBe(true);
    });

    it('allows non-terminal state self-transition as no-op', () => {
      expect(LifecycleManager.validateTransition('available', 'available').allowed).toBe(true);
      expect(LifecycleManager.validateTransition('reserved', 'reserved').allowed).toBe(true);
      expect(LifecycleManager.validateTransition('assigned', 'assigned').allowed).toBe(true);
    });
  });

  describe('Lifecycle Loophole Prevention', () => {
    it('strictly forbids picked_up jumping directly to delivered', () => {
      const res = LifecycleManager.validateTransition('picked_up', 'delivered');
      expect(res.allowed).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Cannot move donation from');
    });

    it('strictly forbids in_transit jumping directly to delivered', () => {
      const res = LifecycleManager.validateTransition('in_transit', 'delivered');
      expect(res.allowed).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('only permits awaiting_ngo_confirmation and disputed as valid targets from picked_up', () => {
      const allowedNext = VALID_LIFECYCLE_TRANSITIONS['picked_up'];
      expect(allowedNext).toEqual(['awaiting_ngo_confirmation', 'disputed']);
    });
  });

  describe('Invalid state jumps', () => {
    it('rejects skipping from available directly to delivered', () => {
      expect(LifecycleManager.validateTransition('available', 'delivered').allowed).toBe(false);
    });

    it('rejects skipping from assigned directly to delivered', () => {
      expect(LifecycleManager.validateTransition('assigned', 'delivered').allowed).toBe(false);
    });

    it('rejects skipping from arrived_at_donor directly to delivered', () => {
      expect(LifecycleManager.validateTransition('arrived_at_donor', 'delivered').allowed).toBe(false);
    });

    it('rejects reserving an item that is already picked up', () => {
      expect(LifecycleManager.validateTransition('picked_up', 'reserved').allowed).toBe(false);
    });
  });

  describe('Terminal state enforcement', () => {
    it('rejects any transition from delivered (delivered is final)', () => {
      const targets: DonationStatus[] = ['available', 'reserved', 'assigned', 'picked_up', 'delivered', 'cancelled_by_donor'];
      targets.forEach((target) => {
        const res = LifecycleManager.validateTransition('delivered', target);
        expect(res.allowed).toBe(false);
        expect(res.error).toContain('Terminal state reached');
      });
    });

    it('rejects any transition from cancelled_by_donor (cancelled is final)', () => {
      const targets: DonationStatus[] = ['available', 'reserved', 'assigned', 'picked_up', 'delivered', 'cancelled_by_donor'];
      targets.forEach((target) => {
        const res = LifecycleManager.validateTransition('cancelled_by_donor', target);
        expect(res.allowed).toBe(false);
        expect(res.error).toContain('Terminal state reached');
      });
    });
  });

  describe('validateRolePermission', () => {
    it('only allows donors to create donations', () => {
      expect(LifecycleManager.validateRolePermission('create_donation', 'donor').allowed).toBe(true);
      expect(LifecycleManager.validateRolePermission('create_donation', 'ngo').allowed).toBe(false);
      expect(LifecycleManager.validateRolePermission('create_donation', 'volunteer').allowed).toBe(false);
      expect(LifecycleManager.validateRolePermission('create_donation', 'public').allowed).toBe(false);
    });

    it('enforces donor ownership for editing listings', () => {
      expect(
        LifecycleManager.validateRolePermission('edit_donation', 'donor', {
          ownerId: 'donor_1',
          actorId: 'donor_1',
        }).allowed
      ).toBe(true);

      const mismatched = LifecycleManager.validateRolePermission('edit_donation', 'donor', {
        ownerId: 'donor_1',
        actorId: 'donor_2',
      });
      expect(mismatched.allowed).toBe(false);
      expect(mismatched.error).toContain('You can only edit your own donation listings');
    });

    it('only allows verified NGOs to reserve surplus food', () => {
      expect(LifecycleManager.validateRolePermission('reserve_donation', 'ngo').allowed).toBe(true);
      expect(LifecycleManager.validateRolePermission('reserve_donation', 'donor').allowed).toBe(false);
      expect(LifecycleManager.validateRolePermission('reserve_donation', 'volunteer').allowed).toBe(false);
    });

    it('enforces NGO ownership when releasing a reservation', () => {
      expect(
        LifecycleManager.validateRolePermission('release_reservation', 'ngo', {
          reservingNgoId: 'ngo_hope',
          actorId: 'ngo_hope',
        }).allowed
      ).toBe(true);

      const unauthorized = LifecycleManager.validateRolePermission('release_reservation', 'ngo', {
        reservingNgoId: 'ngo_hope',
        actorId: 'ngo_other',
      });
      expect(unauthorized.allowed).toBe(false);
      expect(unauthorized.error).toContain('You can only release reservations claimed by your own organization');
    });

    it('only allows delivery couriers to accept tasks', () => {
      expect(LifecycleManager.validateRolePermission('accept_task', 'volunteer').allowed).toBe(true);
      expect(LifecycleManager.validateRolePermission('accept_task', 'ngo').allowed).toBe(false);
      expect(LifecycleManager.validateRolePermission('accept_task', 'donor').allowed).toBe(false);
    });

    it('enforces assigned courier identity when confirming pickup', () => {
      expect(
        LifecycleManager.validateRolePermission('confirm_pickup', 'volunteer', {
          assignedCourierId: 'vol_alex',
          actorId: 'vol_alex',
        }).allowed
      ).toBe(true);

      expect(
        LifecycleManager.validateRolePermission('confirm_pickup', 'volunteer', {
          assignedCourierId: 'vol_alex',
          actorId: 'vol_bob',
        }).allowed
      ).toBe(false);
    });

    it('enforces reserving NGO identity when confirming receipt', () => {
      expect(
        LifecycleManager.validateRolePermission('confirm_receipt', 'ngo', {
          reservingNgoId: 'ngo_hope',
          actorId: 'ngo_hope',
        }).allowed
      ).toBe(true);

      expect(
        LifecycleManager.validateRolePermission('confirm_receipt', 'ngo', {
          reservingNgoId: 'ngo_hope',
          actorId: 'ngo_other',
        }).allowed
      ).toBe(false);
    });
  });
});
