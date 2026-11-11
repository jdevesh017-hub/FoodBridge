/**
 * FoodBridge Volunteer Dispatch Service
 * Manages courier matching, sequential delivery progression,
 * volunteer task cancellation, failed pickup incident reporting,
 * and handover verification.
 */

import { DonationStatus, FoodDonation, VolunteerTask } from '../types';
import { storageAdapter } from './storageAdapter';
import { auditEventRepository } from '../repositories';
import { LifecycleManager } from './lifecycleManager';

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
        ['assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(d.status)
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
        (d.status === 'delivered' || d.status === 'pickup_failed' || d.status === 'delivery_issue' || d.status === 'disputed')
    );
  }

  /**
   * Volunteer claims an available courier run.
   */
  public acceptTask(
    donationId: string,
    volunteer: { id: string; name: string; phone: string; role?: string }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const roleCheck = LifecycleManager.validateRolePermission('accept_task', (volunteer.role as any) || 'volunteer');
    if (!roleCheck.allowed) {
      return { success: false, error: roleCheck.error };
    }

    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) return { success: false, error: 'Task not found.' };
    const item = donations[index];

    if (item.status !== 'reserved' && item.status !== 'volunteer_cancelled') {
      return { success: false, error: `Task is not available for assignment (status: ${item.status.replace(/_/g, ' ')}).` };
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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: volunteer.id,
      actorName: volunteer.name,
      actorRole: 'volunteer',
      eventType: 'task_accepted',
      metadata: { volunteerPhone: volunteer.phone },
      note: `Courier task accepted by ${volunteer.name}`,
    });

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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: item.assignedVolunteerId || 'unknown_volunteer',
      actorName: volunteerName,
      actorRole: 'volunteer',
      eventType: 'volunteer_arrived',
      metadata: { stage: 'donor_pickup' },
      note: `${volunteerName} arrived on site at donor premises.`,
    });

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
      note: `Food safely loaded in thermal transport carrier. Verified pickup weight: ${item.quantity.pickupConfirmedKg} kg. Starting transit to NGO.`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: item.assignedVolunteerId || 'unknown_volunteer',
      actorName: volunteerName,
      actorRole: 'volunteer',
      eventType: 'pickup_confirmed',
      metadata: { pickupConfirmedKg: item.quantity.pickupConfirmedKg },
      note: `Food pickup confirmed: ${item.quantity.pickupConfirmedKg} kg loaded.`,
    });

    return { success: true };
  }

  /**
   * Step 4 (Volunteer): Delivery partner arrives at NGO and marks arrival / delivery completion for NGO verification.
   * Status transitions to 'awaiting_ngo_confirmation'.
   */
  public confirmArrivalAtNgo(
    donationId: string,
    volunteerName: string,
    notes?: string
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Task not found.' };

    const item = donations[index];
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'awaiting_ngo_confirmation');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || `Cannot mark arrived at NGO from status ${item.status}.` };
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

  /**
   * Step 5 (NGO): NGO confirms actual food receipt, verifies quantity received, and concludes mission.
   * Only now does the status transition to 'delivered', generating the Verified Impact Receipt.
   */
  public confirmNgoReceipt(
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
      return { success: false, error: 'Donation has already been delivered and impact receipt generated. Duplicate confirmations are rejected.' };
    }

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'delivered');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || `Cannot confirm receipt for donation with status '${item.status}'.` };
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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: item.reservedByNgoId || 'unknown_ngo',
      actorName: `${ngoName} (${params.receivingSupervisorName})`,
      actorRole: 'ngo',
      eventType: 'delivery_confirmed',
      metadata: {
        receivedKg: params.receivedKg,
        mealsProvided,
        discrepancyKg,
        receiptId: item.impactReceipt.receiptId,
      },
      note: `Delivery confirmed by NGO: ${params.receivedKg} kg verified. Discrepancy: ${discrepancyKg} kg.`,
    });

    return { success: true, donation: item };
  }

  /**
   * NGO reports an issue upon receipt or during delivery (damaged food, discrepancy, temperature breach).
   */
  public reportDiscrepancy(
    donationId: string,
    reporterRole: 'ngo' | 'volunteer',
    reporterName: string,
    issue: {
      issueType: 'damaged_food' | 'quantity_mismatch' | 'safety_temp_breach' | 'packaging_breach' | 'facility_closed';
      details: string;
      actualWeightReceivedKg?: number;
    }
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Donation not found.' };

    const item = donations[index];
    item.status = 'disputed';
    const nowIso = new Date().toISOString();
    item.discrepancyReport = {
      reportedAt: nowIso,
      reportedByRole: reporterRole,
      reporterName,
      issueType: issue.issueType,
      details: issue.details,
      actualWeightReceivedKg: issue.actualWeightReceivedKg,
    };

    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'disputed',
      timestamp: nowIso,
      actor: reporterName,
      note: `Delivery issue flagged [${issue.issueType.replace(/_/g, ' ')}]: ${issue.details}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: reporterRole === 'ngo' ? (item.reservedByNgoId || 'ngo') : (item.assignedVolunteerId || 'volunteer'),
      actorName: reporterName,
      actorRole: reporterRole,
      eventType: 'delivery_issue_reported',
      metadata: { issueType: issue.issueType, details: issue.details, actualWeight: issue.actualWeightReceivedKg },
      note: `Discrepancy reported [${issue.issueType}]: ${issue.details}`,
    });

    return { success: true };
  }

  /**
   * Report transit or delivery failure from the volunteer courier.
   */
  public reportDeliveryFailure(
    donationId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);
    if (index === -1) return { success: false, error: 'Donation not found.' };

    const item = donations[index];
    item.status = 'delivery_issue';
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'delivery_issue',
      timestamp: nowIso,
      actor: volunteerName,
      note: `Delivery issue reported: ${reason}`,
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
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'volunteer_cancelled');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || 'Cannot cancel after food has been picked up from donor.' };
    }

    const prevVolunteerId = item.assignedVolunteerId || 'unknown_volunteer';
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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: prevVolunteerId,
      actorName: volunteerName,
      actorRole: 'volunteer',
      eventType: 'volunteer_cancelled',
      metadata: { reason },
      note: `Volunteer released assignment: ${reason}`,
    });

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
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'pickup_failed');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
    }

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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: item.assignedVolunteerId || 'unknown_volunteer',
      actorName: volunteerName,
      actorRole: 'volunteer',
      eventType: 'pickup_failed',
      metadata: { reason, details },
      note: `Pickup failed: ${reason}. ${details || ''}`.trim(),
    });

    return { success: true };
  }
}

export const volunteerService = new VolunteerService();
