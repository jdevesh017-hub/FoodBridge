/**
 * FoodBridge Volunteer Dispatch Service
 * Manages courier matching, sequential delivery progression,
 * volunteer task cancellation, failed pickup incident reporting,
 * and handover verification.
 */

import { DonationStatus, FoodDonation, VolunteerTask } from '../types';
import { deliveryRepository, donationRepository, auditEventRepository } from '../repositories';
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
    return deliveryRepository.getAvailableTasks({ lat: volunteerLat, lng: volunteerLng }) as (FoodDonation & { distanceKm: number })[];
  }

  /**
   * Get all active tasks currently assigned to a volunteer.
   */
  public getMyAssignments(volunteerId: string): FoodDonation[] {
    return deliveryRepository.getMyActiveDeliveries(volunteerId);
  }

  /**
   * Get completed delivery history for a volunteer.
   */
  public getMyDeliveryHistory(volunteerId: string): FoodDonation[] {
    return deliveryRepository.getMyDeliveryHistory(volunteerId);
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

    const res = deliveryRepository.acceptTask(donationId, volunteer);
    if (!res.success || !res.donation) {
      return res;
    }

    auditEventRepository.record({
      entityId: res.donation.id,
      entityType: 'donation',
      actorId: volunteer.id,
      actorName: volunteer.name,
      actorRole: 'volunteer',
      eventType: 'task_accepted',
      metadata: { volunteerPhone: volunteer.phone },
      note: `Courier task accepted by ${volunteer.name}`,
    });

    return res;
  }

  /**
   * Step 2: Volunteer confirms physical arrival at donor kitchen.
   */
  public confirmArrivalAtDonor(
    donationId: string,
    volunteerId: string,
    volunteerName: string
  ): { success: boolean; error?: string } {
    const res = deliveryRepository.confirmArrivalAtDonor(donationId, volunteerId, volunteerName);
    if (!res.success) {
      return res;
    }

    const item = donationRepository.findById(donationId);
    auditEventRepository.record({
      entityId: donationId,
      entityType: 'donation',
      actorId: item?.assignedVolunteerId || volunteerId,
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
    volunteerId: string,
    volunteerName: string,
    confirmedKg?: number
  ): { success: boolean; error?: string } {
    const res = deliveryRepository.confirmPickup(donationId, volunteerId, volunteerName, confirmedKg || 0);
    if (!res.success || !res.donation) {
      return { success: false, error: res.error };
    }

    auditEventRepository.record({
      entityId: res.donation.id,
      entityType: 'donation',
      actorId: res.donation.assignedVolunteerId || volunteerId,
      actorName: volunteerName,
      actorRole: 'volunteer',
      eventType: 'pickup_confirmed',
      metadata: { pickupConfirmedKg: res.donation.quantity.pickupConfirmedKg },
      note: `Food pickup confirmed: ${res.donation.quantity.pickupConfirmedKg} kg loaded.`,
    });

    return { success: true };
  }

  /**
   * Step 4 (Volunteer): Delivery partner arrives at NGO and marks arrival / delivery completion for NGO verification.
   * Status transitions to 'awaiting_ngo_confirmation'.
   */
  public confirmArrivalAtNgo(
    donationId: string,
    volunteerId: string,
    volunteerName: string,
    notes?: string
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    return deliveryRepository.confirmArrivalAtNgo(donationId, volunteerId, volunteerName, notes);
  }

  /**
   * Step 5 (NGO): NGO confirms actual food receipt, verifies quantity received, and concludes mission.
   * Only now does the status transition to 'delivered', generating the Verified Impact Receipt.
   */
  public confirmNgoReceipt(
    donationId: string,
    ngoId: string,
    ngoName: string,
    params: {
      receivedKg: number;
      receivingSupervisorName: string;
      notes?: string;
    }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const res = deliveryRepository.confirmReceipt(donationId, ngoId, ngoName, params);
    if (!res.success || !res.donation) {
      return res;
    }

    auditEventRepository.record({
      entityId: res.donation.id,
      entityType: 'donation',
      actorId: res.donation.reservedByNgoId || ngoId,
      actorName: `${ngoName} (${params.receivingSupervisorName})`,
      actorRole: 'ngo',
      eventType: 'delivery_confirmed',
      metadata: {
        receivedKg: params.receivedKg,
        mealsProvided: res.donation.impactReceipt?.mealsProvided,
        discrepancyKg: res.donation.quantity.discrepancyKg,
        receiptId: res.donation.impactReceipt?.receiptId,
      },
      note: `Delivery confirmed by NGO: ${params.receivedKg} kg verified. Discrepancy: ${res.donation.quantity.discrepancyKg} kg.`,
    });

    return res;
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
    const nowIso = new Date().toISOString();
    const discrepancyReport = {
      reportedAt: nowIso,
      reportedByRole: reporterRole,
      reporterName,
      issueType: issue.issueType,
      details: issue.details,
      actualWeightReceivedKg: issue.actualWeightReceivedKg,
    };

    const res = deliveryRepository.reportDiscrepancy(donationId, discrepancyReport);
    if (!res.success) {
      return res;
    }

    const item = donationRepository.findById(donationId);
    auditEventRepository.record({
      entityId: donationId,
      entityType: 'donation',
      actorId: reporterRole === 'ngo' ? (item?.reservedByNgoId || 'ngo') : (item?.assignedVolunteerId || 'volunteer'),
      actorName: reporterName,
      actorRole: reporterRole,
      eventType: 'delivery_issue_reported',
      metadata: { issueType: issue.issueType, details: issue.details, actualWeight: issue.actualWeightReceivedKg },
      note: `Discrepancy reported [${issue.issueType}]: ${issue.details}`,
    });

    return { success: true };
  }


  /**
   * Exception Recovery 1: Volunteer cancels assignment before physical pickup.
   * Reopens task in the dispatch pool with urgent priority.
   */
  public cancelAssignment(
    donationId: string,
    volunteerId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string } {
    const res = deliveryRepository.cancelAssignment(donationId, volunteerId, volunteerName, reason);
    if (!res.success) {
      return res;
    }

    auditEventRepository.record({
      entityId: donationId,
      entityType: 'donation',
      actorId: volunteerId,
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
    volunteerId: string,
    volunteerName: string,
    reason: string,
    details?: string
  ): { success: boolean; error?: string } {
    const res = deliveryRepository.reportPickupFailure(donationId, volunteerId, volunteerName, reason, details);
    if (!res.success) {
      return res;
    }

    auditEventRepository.record({
      entityId: donationId,
      entityType: 'donation',
      actorId: volunteerId,
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
