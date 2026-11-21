import { DiscrepancyReport, FoodDonation } from '../../types';
import { IDeliveryRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';
import { LifecycleManager } from '../../services/lifecycleManager';

// Haversine distance helper
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export class LocalStorageDeliveryRepository implements IDeliveryRepository {
  public getAvailableTasks(
    volunteerLocation = { lat: 19.072, lng: 72.871 },
    maxDistanceKm?: number
  ): FoodDonation[] {
    const donations = storageAdapter.getDonations();
    const tasks = donations
      .filter((d) => d.status === 'reserved' || d.status === 'volunteer_cancelled')
      .map((d) => {
        const dist = calculateDistanceKm(
          volunteerLocation.lat,
          volunteerLocation.lng,
          d.donorLat,
          d.donorLng
        );
        return { ...d, distanceKm: dist };
      })
      .filter((d) => (maxDistanceKm ? d.distanceKm <= maxDistanceKm : true))
      .sort((a, b) => {
        if (a.status === 'volunteer_cancelled' && b.status !== 'volunteer_cancelled') return -1;
        if (b.status === 'volunteer_cancelled' && a.status !== 'volunteer_cancelled') return 1;
        return a.distanceKm - b.distanceKm;
      });

    return tasks;
  }

  public getMyActiveDeliveries(volunteerId: string): FoodDonation[] {
    const donations = storageAdapter.getDonations();
    return donations.filter(
      (d) =>
        d.assignedVolunteerId === volunteerId &&
        ['assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(
          d.status
        )
    );
  }

  public getMyDeliveryHistory(volunteerId: string): FoodDonation[] {
    const donations = storageAdapter.getDonations();
    return donations.filter(
      (d) =>
        d.assignedVolunteerId === volunteerId &&
        (d.status === 'delivered' ||
          d.status === 'pickup_failed' ||
          d.status === 'delivery_issue' ||
          d.status === 'disputed')
    );
  }

  public acceptTask(
    donationId: string,
    volunteer: { id: string; name: string; phone: string }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) return { success: false, error: 'Task not found.' };
    const item = donations[index];

    if (item.status !== 'reserved' && item.status !== 'volunteer_cancelled') {
      return {
        success: false,
        error: `Task is not available for assignment (status: ${item.status.replace(/_/g, ' ')}).`,
      };
    }

    if (item.assignedVolunteerId) {
      return { success: false, error: 'Task is already assigned to a delivery courier.' };
    }

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'assigned');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
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
      note: 'Volunteer courier accepted assignment. Proceeding to donor collection location.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true, donation: item };
  }

  public confirmArrivalAtDonor(
    donationId: string,
    volunteerName: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'arrived_at_donor');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
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

  public confirmPickup(
    donationId: string,
    volunteerName: string,
    confirmedKg?: number,
    notes?: string
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'picked_up');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
    }

    item.status = 'picked_up';
    if (confirmedKg !== undefined && confirmedKg > 0) {
      item.quantity.pickupConfirmedKg = confirmedKg;
    } else {
      item.quantity.pickupConfirmedKg = item.quantity.measuredKg || item.quantity.donorEstimatedKg;
    }

    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'picked_up',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Food safely loaded in thermal transport carrier. Verified pickup weight: ${item.quantity.pickupConfirmedKg} kg. Starting transit to NGO. ${notes || ''}`.trim(),
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true, donation: item };
  }

  public confirmArrivalAtNgo(
    donationId: string,
    volunteerName: string,
    notes?: string
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(
      item.status,
      'awaiting_ngo_confirmation'
    );
    if (!transitionCheck.allowed) {
      return {
        success: false,
        error: transitionCheck.error || `Cannot mark arrived at NGO from status ${item.status}.`,
      };
    }

    item.status = 'awaiting_ngo_confirmation';
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'awaiting_ngo_confirmation',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Volunteer arrived at destination (${item.reservedByNgoName || 'NGO'}). Food handed over; awaiting NGO supervisor inspection and sign-off. ${notes || ''}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true, donation: item };
  }

  public confirmReceipt(
    donationId: string,
    ngoName: string,
    params: {
      receivedKg: number;
      receivingSupervisorName: string;
      notes?: string;
    }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    if (!donationId) return { success: false, error: 'Donation ID is required.' };
    if (!params.receivedKg || params.receivedKg <= 0) {
      return { success: false, error: 'Please enter a valid received quantity in kilograms.' };
    }
    if (!params.receivingSupervisorName.trim()) {
      return { success: false, error: 'Receiving staff / supervisor name is required.' };
    }

    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Donation not found.' };

    const item = donations[index];

    if (item.status === 'delivered' || item.impactReceipt) {
      return {
        success: false,
        error:
          'Donation has already been delivered and impact receipt generated. Duplicate confirmations are rejected.',
      };
    }

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'delivered');
    if (!transitionCheck.allowed) {
      return {
        success: false,
        error: transitionCheck.error || `Cannot confirm receipt for donation with status '${item.status}'.`,
      };
    }

    const pickupWeight = item.quantity.pickupConfirmedKg || item.quantity.donorEstimatedKg;
    const discrepancyKg = Math.round((params.receivedKg - pickupWeight) * 10) / 10;

    item.status = 'delivered';
    item.quantity.deliveredKg = params.receivedKg;
    item.quantity.discrepancyKg = discrepancyKg;
    const mealsProvided = Math.round(params.receivedKg / 0.35);

    const nowIso = new Date().toISOString();
    item.impactReceipt = {
      receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      donationId: item.id,
      deliveredAt: nowIso,
      donorName: item.donorName,
      ngoName: item.reservedByNgoName || ngoName,
      volunteerName: item.assignedVolunteerName || 'Volunteer Courier',
      foodName: item.foodName,
      donorEstimatedKg: item.quantity.donorEstimatedKg,
      pickupConfirmedKg: item.quantity.pickupConfirmedKg || item.quantity.donorEstimatedKg,
      deliveredKg: params.receivedKg,
      mealsProvided,
      co2PreventedKg: Math.round(params.receivedKg * 2.5 * 10) / 10,
      fssaiRuleCitation: item.safety.fssaiRuleCitation,
    };

    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'delivered',
      timestamp: nowIso,
      actor: `${ngoName} (${params.receivingSupervisorName})`,
      note: `Food safely received and verified. Net weight accepted: ${params.receivedKg} kg (~${mealsProvided} meals). Discrepancy: ${discrepancyKg} kg. ${params.notes || 'Condition verified in good order.'}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true, donation: item };
  }

  public reportPickupFailure(
    donationId: string,
    volunteerName: string,
    reason: string,
    details?: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'pickup_failed');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || 'Cannot mark pickup failed from current state.' };
    }

    item.status = 'pickup_failed';
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'pickup_failed',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Pickup incident reported: [${reason}] ${details || ''}`.trim(),
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true };
  }

  public cancelAssignment(
    donationId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'volunteer_cancelled');
    if (!transitionCheck.allowed) {
      return {
        success: false,
        error: transitionCheck.error || 'Cannot cancel after food has been picked up from donor.',
      };
    }

    item.status = 'volunteer_cancelled';
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

  public reportDiscrepancy(
    donationId: string,
    report: DiscrepancyReport
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Donation not found.' };

    const item = donations[index];
    item.status = 'disputed';
    const nowIso = new Date().toISOString();
    item.discrepancyReport = report;
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'disputed',
      timestamp: nowIso,
      actor: report.reporterName,
      note: `Delivery issue flagged [${report.issueType.replace(/_/g, ' ')}]: ${report.details}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    return { success: true };
  }
}
