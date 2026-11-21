import { FoodDonation } from '../../types';
import { IReservationRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';
import { LifecycleManager } from '../../services/lifecycleManager';

export class LocalStorageReservationRepository implements IReservationRepository {
  public acquireLock(
    donationId: string,
    ngoId: string,
    leaseSeconds = 90
  ): { success: boolean; error?: string } {
    if (!donationId || !ngoId) {
      return { success: false, error: 'Donation ID and NGO ID are required.' };
    }

    const donations = storageAdapter.getDonations();
    const target = donations.find((d) => d.id === donationId);

    if (!target) {
      return { success: false, error: 'Donation not found.' };
    }

    if (target.status !== 'available') {
      const actorInfo = target.reservedByNgoName ? ` by ${target.reservedByNgoName}` : '';
      return {
        success: false,
        error: `Donation is no longer available (already ${target.status.replace(/_/g, ' ')}${actorInfo}).`,
      };
    }

    if (target.reservedByNgoId === ngoId) {
      return {
        success: false,
        error: 'Your organization has already reserved this donation.',
      };
    }

    const now = new Date();
    if (target.reservationLock) {
      const expires = new Date(target.reservationLock.lockExpiresAt);
      if (expires > now && target.reservationLock.leaseHolderId !== ngoId) {
        const remainingSec = Math.ceil((expires.getTime() - now.getTime()) / 1000);
        return {
          success: false,
          error: `Another community organization is currently reviewing this donation (lease hold expires in ${remainingSec}s). Please check back shortly.`,
        };
      }
    }

    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    target.reservationLock = {
      lockedAt: now.toISOString(),
      lockExpiresAt: expiresAt,
      leaseHolderId: ngoId,
    };

    storageAdapter.saveDonations(donations);
    return { success: true };
  }

  public releaseLock(donationId: string, ngoId: string): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const target = donations.find((d) => d.id === donationId);

    if (!target) {
      return { success: false, error: 'Donation not found.' };
    }

    if (target.reservationLock && target.reservationLock.leaseHolderId === ngoId) {
      target.reservationLock = undefined;
      storageAdapter.saveDonations(donations);
    }

    return { success: true };
  }

  public confirmReservation(
    donationId: string,
    ngo: { id: string; name: string; address: string; lat: number; lng: number }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    if (!donationId || !ngo.id || !ngo.name) {
      return { success: false, error: 'Incomplete reservation parameters.' };
    }

    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) {
      return { success: false, error: 'Donation not found.' };
    }

    const item = donations[index];

    if (item.status !== 'available') {
      return {
        success: false,
        error: `Cannot complete reservation: Donation status is '${item.status.replace(/_/g, ' ')}'${
          item.reservedByNgoName ? ` (claimed by ${item.reservedByNgoName})` : ''
        }.`,
      };
    }

    const now = new Date();
    if (item.reservationLock) {
      const lockExpiry = new Date(item.reservationLock.lockExpiresAt);
      if (lockExpiry > now && item.reservationLock.leaseHolderId !== ngo.id) {
        return {
          success: false,
          error: 'Reservation lock is currently held by another organization.',
        };
      }
    }

    if (item.reservedByNgoId) {
      return {
        success: false,
        error: 'This donation has already been claimed.',
      };
    }

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'reserved');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
    }

    item.status = 'reserved';
    item.reservedByNgoId = ngo.id;
    item.reservedByNgoName = ngo.name;
    item.ngoAddress = ngo.address;
    item.ngoLat = ngo.lat;
    item.ngoLng = ngo.lng;
    item.reservationLock = undefined;

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'reserved',
      timestamp: nowIso,
      actor: ngo.name,
      note: 'Donation reserved for community redistribution. Dispatched to volunteer courier board.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true, donation: item };
  }

  public releaseReservation(donationId: string, ngoName: string): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) return { success: false, error: 'Donation not found.' };
    const item = donations[index];

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'available');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || `Cannot release donation with status ${item.status}` };
    }

    item.status = 'available';
    item.reservedByNgoId = undefined;
    item.reservedByNgoName = undefined;
    item.assignedVolunteerId = undefined;
    item.assignedVolunteerName = undefined;
    item.volunteerPhone = undefined;

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'available',
      timestamp: nowIso,
      actor: ngoName,
      note: 'Reservation cancelled by NGO. Returned to available pool.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true };
  }
}
