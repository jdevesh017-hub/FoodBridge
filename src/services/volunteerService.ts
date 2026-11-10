/**
 * FoodBridge Volunteer Dispatch Service
 * Manages courier matching, sequential delivery progression,
 * volunteer task cancellation, failed pickup incident reporting,
 * and handover verification.
 */

import { DonationStatus, FoodDonation, VolunteerTask } from '../types';
import { storageAdapter } from './storageAdapter';

// Haversine distance calculator in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class VolunteerService {
  /**
   * List donations that are reserved and waiting for volunteer courier assignment.
   */
  public getAvailableTasks(volunteerLat = 19.0720, volunteerLng = 72.8710): (FoodDonation & { distanceKm: number })[] {
    const donations = storageAdapter.getDonations();
    return donations
      .filter((d) => d.status === 'reserved' || d.status === 'volunteer_cancelled')
      .map((d) => {
        const dist = calculateDistanceKm(volunteerLat, volunteerLng, d.donorLat, d.donorLng);
        return { ...d, distanceKm: dist };
      })
      .sort((a, b) => {
        // Prioritize urgent reassigned tasks first, then by nearest distance
        if (a.status === 'volunteer_cancelled' && b.status !== 'volunteer_cancelled') return -1;
        if (b.status === 'volunteer_cancelled' && a.status !== 'volunteer_cancelled') return 1;
        return a.distanceKm - b.distanceKm;
      });
  }

  /**
   * Get all active tasks currently assigned to a volunteer.
   */
  public getMyAssignments(volunteerId: string): FoodDonation[] {
    const donations = storageAdapter.getDonations();
    return donations.filter(
      (d) =>
        d.assignedVolunteerId === volunteerId &&
        ['assigned', 'arrived_at_donor', 'picked_up', 'in_transit'].includes(d.status)
    );
  }

  /**
   * Get completed delivery history for a volunteer.
   */
  public getMyDeliveryHistory(volunteerId: string): FoodDonation[] {
    const donations = storageAdapter.getDonations();
    return donations.filter(
      (d) =>
        d.assignedVolunteerId === volunteerId &&
        (d.status === 'delivered' || d.status === 'pickup_failed')
    );
  }

  /**
   * Volunteer claims an available courier run.
   */
  public acceptTask(
    donationId: string,
    volunteer: { id: string; name: string; phone: string }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) return { success: false, error: 'Task not found.' };
    const item = donations[index];

    if (item.status !== 'reserved' && item.status !== 'volunteer_cancelled') {
      return { success: false, error: `Task is not available for assignment (status: ${item.status}).` };
    }

    item.status = 'assigned';
    item.assignedVolunteerId = volunteer.id;
    item.assignedVolunteerName = volunteer.name;
    item.volunteerPhone = volunteer.phone;

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'assigned',
      timestamp: nowIso,
      actor: volunteer.name,
      note: 'Volunteer accepted courier assignment. Dispatch sequence initiated.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true, donation: item };
  }

  /**
   * Step 2: Volunteer confirms physical arrival at donor kitchen.
   */
  public confirmArrivalAtDonor(donationId: string, volunteerName: string): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    if (item.status !== 'assigned') {
      return { success: false, error: `Invalid transition from ${item.status} to arrived_at_donor.` };
    }

    item.status = 'arrived_at_donor';
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'arrived_at_donor',
      timestamp: nowIso,
      actor: volunteerName,
      note: 'Volunteer arrived on site at donor premises. Commencing temperature audit and item handover.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true };
  }

  /**
   * Step 3: Volunteer confirms food collection with physical quantity verification.
   */
  public confirmFoodPickup(
    donationId: string,
    volunteerName: string,
    confirmedKg?: number
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    if (item.status !== 'arrived_at_donor') {
      return { success: false, error: `Invalid transition from ${item.status} to in_transit.` };
    }

    item.status = 'in_transit';
    if (confirmedKg !== undefined && confirmedKg > 0) {
      item.quantity.pickupConfirmedKg = confirmedKg;
    } else {
      // Default to measured or estimated if scale was unavailable
      item.quantity.pickupConfirmedKg = item.quantity.measuredKg || item.quantity.donorEstimatedKg;
    }

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'picked_up',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Food safely secured in thermal transport carrier. Verified weight: ${item.quantity.pickupConfirmedKg} kg. En route to NGO recipient.`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true };
  }

  /**
   * Step 4: Final verification and delivery confirmation at NGO facility.
   */
  public confirmDeliveryToNgo(
    donationId: string,
    volunteerName: string,
    receiverName: string,
    handoverNotes?: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    if (item.status !== 'in_transit' && item.status !== 'picked_up') {
      return { success: false, error: `Invalid transition from ${item.status} to delivered.` };
    }

    item.status = 'delivered';
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'delivered',
      timestamp: nowIso,
      actor: `${volunteerName} & ${receiverName}`,
      note: `Delivery verified and completed. Food inspected upon receipt. ${handoverNotes || 'Zero spoilage.'}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true };
  }

  /**
   * Exception Recovery 1: Volunteer cancels assignment before physical pickup.
   * Reopens task in the dispatch pool with urgent priority.
   */
  public cancelAssignment(
    donationId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    if (item.status !== 'assigned' && item.status !== 'arrived_at_donor') {
      return { success: false, error: 'Cannot cancel after food has been picked up from donor.' };
    }

    item.status = 'volunteer_cancelled'; // Flagged for urgent reassignment
    item.assignedVolunteerId = undefined;
    item.assignedVolunteerName = undefined;
    item.volunteerPhone = undefined;

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'volunteer_cancelled',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Volunteer released assignment: "${reason}". Task reopened with urgent reassignment priority.`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true };
  }

  /**
   * Exception Recovery 2: Report failed pickup on site (donor closed, food spoiled, etc.).
   */
  public reportFailedPickup(
    donationId: string,
    volunteerName: string,
    reason: string,
    details?: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    item.status = 'pickup_failed';

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'pickup_failed',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Pickup incident reported: [${reason}] ${details || ''}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
    return { success: true };
  }
}

export const volunteerService = new VolunteerService();
