/**
 * FoodBridge Donation Service
 * Encapsulates all donation operations, atomic reservation locking,
 * timeline auditing, 4-tier quantity tracking, and FSSAI safety evaluations.
 */

import { DonationStatus, FoodCategory, FoodDonation, QuantityLedger, StorageCondition, DietaryTag, TemperatureUnit, PackagingCondition, AuditEvent } from '../types';
import { evaluateFoodSafetyAssessment, evaluateFssaiFoodSafety, convertToCelsius } from './fssaiSafetyRules';
import { storageAdapter } from './storageAdapter';
import { donationRepository, auditEventRepository } from '../repositories';
import { LifecycleManager } from './lifecycleManager';

export class DonationService {
  /**
   * Acquire atomic lease lock on a donation to prevent concurrent double-booking.
   * Prototype Note: Uses localStorage and client-side lease timestamps.
   * Real production deployment requires backend transactional locking (e.g. Postgres SELECT ... FOR UPDATE).
   */
  public acquireReservationLock(donationId: string, ngoId: string, userRole?: string, leaseSeconds = 90): { success: boolean; error?: string } {
    if (userRole && userRole !== 'ngo') {
      return { success: false, error: 'Permission denied: Only registered NGOs and community kitchens can reserve surplus donations.' };
    }

    if (!donationId || !ngoId) {
      return { success: false, error: 'Donation ID and NGO ID are required.' };
    }

    const donations = storageAdapter.getDonations();
    const target = donations.find((d) => d.id === donationId);

    if (!target) {
      return { success: false, error: 'Donation not found.' };
    }

    // Check if donation is already claimed
    if (target.status !== 'available') {
      const actorInfo = target.reservedByNgoName ? ` by ${target.reservedByNgoName}` : '';
      return {
        success: false,
        error: `Donation is no longer available (already ${target.status.replace(/_/g, ' ')}${actorInfo}). Duplicate reservations are not permitted.`,
      };
    }

    // Check for duplicate reservation: has this NGO already reserved this specific donation?
    if (target.reservedByNgoId === ngoId) {
      return {
        success: false,
        error: 'Your organization has already reserved this donation.',
      };
    }

    // Check if an unexpired lease lock exists for another user
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

    // Grant temporary lease lock
    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    target.reservationLock = {
      lockedAt: now.toISOString(),
      lockExpiresAt: expiresAt,
      leaseHolderId: ngoId,
    };

    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: target.id,
      entityType: 'donation',
      actorId: ngoId,
      actorName: 'NGO Reservation Lock',
      actorRole: 'ngo',
      eventType: 'reservation_locked',
      metadata: { leaseSeconds, expiresAt },
      note: `Atomic reservation lease held for ${leaseSeconds}s`,
    });

    return { success: true };
  }

  /**
   * Complete atomic reservation for an NGO.
   */
  public confirmReservation(
    donationId: string,
    ngo: {
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      role?: string;
    }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    if (ngo.role && ngo.role !== 'ngo') {
      return { success: false, error: 'Permission denied: Only registered NGOs can complete food reservations.' };
    }

    if (!donationId || !ngo.id || !ngo.name) {
      return { success: false, error: 'Incomplete reservation parameters.' };
    }

    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) {
      return { success: false, error: 'Donation not found.' };
    }

    const item = donations[index];

    // Verify reservation integrity
    if (item.status !== 'available') {
      return {
        success: false,
        error: `Cannot complete reservation: Donation status is '${item.status.replace(/_/g, ' ')}'${
          item.reservedByNgoName ? ` (claimed by ${item.reservedByNgoName})` : ''
        }.`,
      };
    }

    // Verify lease lock holder if a lock is active
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

    // Check duplicate reservation within active claims: prevent claiming if already reserved
    if (item.reservedByNgoId) {
      return {
        success: false,
        error: 'This donation has already been claimed.',
      };
    }

    // Verify valid lifecycle transition
    const transitionCheck = LifecycleManager.validateTransition(item.status, 'reserved');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
    }

    // Transition status to reserved
    item.status = 'reserved';
    item.reservedByNgoId = ngo.id;
    item.reservedByNgoName = ngo.name;
    item.ngoAddress = ngo.address;
    item.ngoLat = ngo.lat;
    item.ngoLng = ngo.lng;
    item.reservationLock = undefined; // release lock

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

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: ngo.id,
      actorName: ngo.name,
      actorRole: 'ngo',
      eventType: 'reservation_confirmed',
      metadata: { ngoId: ngo.id, ngoName: ngo.name },
      note: `Donation reserved by ${ngo.name}`,
    });

    return { success: true, donation: item };
  }

  /**
   * NGO releases reservation back to public available pool.
   */
  public releaseReservation(donationId: string, ngoName: string, reason?: string): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) return { success: false, error: 'Donation not found' };
    const item = donations[index];

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'available');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error || `Cannot release donation with status ${item.status}` };
    }

    const prevNgoId = item.reservedByNgoId || 'unknown_ngo';
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
      note: `Reservation cancelled by NGO. ${reason ? `Reason: ${reason}` : 'Returned to available pool.'}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: prevNgoId,
      actorName: ngoName,
      actorRole: 'ngo',
      eventType: 'reservation_released',
      metadata: { reason },
      note: `Reservation released by ${ngoName}. ${reason || ''}`.trim(),
    });

    return { success: true };
  }

  /**
   * Create a new donation entry.
   */
  public createDonation(params: {
    donorId: string;
    donorName: string;
    donorType: 'restaurant' | 'hotel' | 'canteen' | 'caterer' | 'supermarket' | 'bakery';
    donorAddress: string;
    donorLat: number;
    donorLng: number;
    donorContactPhone: string;
    foodName: string;
    foodCategory: FoodCategory;
    description: string;
    dietaryTags: DietaryTag[];
    donorEstimatedKg: number;
    measuredKg?: number;
    storageCondition: StorageCondition;
    temperatureCelsius?: number;
    temperatureUnit?: TemperatureUnit;
    preparationTimestamp: string;
    isAllergenLabelled: boolean;
    isCleanPackaged: boolean;
    packagingCondition?: PackagingCondition;
    foodHandlingNotes?: string;
    bestBeforeTimestamp?: string;
    pickupWindowStart: string;
    pickupWindowEnd: string;
    specialHandlingNotes?: string;
    photoUrl?: string;
  }): { success: boolean; donation?: FoodDonation; error?: string } {
    if (!params.foodName.trim()) {
      return { success: false, error: 'Food name / preparation title is required.' };
    }

    if (!params.foodCategory) {
      return { success: false, error: 'Food category is required for safety assessment.' };
    }

    if (isNaN(params.donorEstimatedKg) || params.donorEstimatedKg <= 0) {
      return { success: false, error: 'Please enter a valid surplus quantity in kilograms (greater than 0).' };
    }

    if (params.donorEstimatedKg > 1000) {
      return { success: false, error: 'Estimated quantity exceeds the single-batch intake limit of 1000 kg.' };
    }

    if (params.measuredKg !== undefined && (isNaN(params.measuredKg) || params.measuredKg <= 0)) {
      return { success: false, error: 'Scale-measured quantity must be a positive number if provided.' };
    }

    // Storage and temperature validation
    if (!params.storageCondition) {
      return { success: false, error: 'Storage condition must be specified.' };
    }

    const tempReadingInC = params.temperatureCelsius !== undefined
      ? (params.temperatureUnit === 'fahrenheit' ? convertToCelsius(params.temperatureCelsius, 'fahrenheit') : params.temperatureCelsius)
      : undefined;

    if (tempReadingInC !== undefined && (isNaN(tempReadingInC) || tempReadingInC < -40 || tempReadingInC > 120)) {
      return { success: false, error: 'Recorded temperature must be a realistic reading between -40°C (-40°F) and 120°C (248°F).' };
    }

    // Preparation timestamp validation
    const prepDate = new Date(params.preparationTimestamp);
    if (isNaN(prepDate.getTime())) {
      return { success: false, error: 'Valid preparation timestamp is required.' };
    }
    const now = new Date();
    if (prepDate > now) {
      return { success: false, error: 'Preparation time cannot be set in the future.' };
    }

    // Pickup window validation
    const pickupStart = new Date(params.pickupWindowStart);
    const pickupEnd = new Date(params.pickupWindowEnd);
    if (isNaN(pickupStart.getTime()) || isNaN(pickupEnd.getTime())) {
      return { success: false, error: 'Valid pickup window start and end times are required.' };
    }
    if (pickupEnd <= pickupStart) {
      return { success: false, error: 'Pickup deadline must be after pickup start time.' };
    }
    if (pickupEnd <= now) {
      return { success: false, error: 'Pickup deadline cannot be in the past.' };
    }

    // Run structured food safety assessment
    const safety = evaluateFoodSafetyAssessment({
      category: params.foodCategory,
      storageCondition: params.storageCondition,
      temperature: params.temperatureCelsius,
      temperatureUnit: params.temperatureUnit || 'celsius',
      preparationTimestamp: params.preparationTimestamp,
      isAllergenLabelled: params.isAllergenLabelled,
      isCleanPackaged: params.isCleanPackaged,
      packagingCondition: params.packagingCondition,
      foodHandlingNotes: params.foodHandlingNotes,
      bestBeforeTimestamp: params.bestBeforeTimestamp,
    });

    if (safety.assessmentOutcome === 'REJECTED') {
      return {
        success: false,
        error: `Food Safety Criteria Not Met (REJECTED): ${safety.assessmentReasons.join(' ')}`,
      };
    }

    // Ensure pickup deadline does not exceed the safe consumption window
    const safeUntilDate = new Date(safety.safeConsumeUntil);
    if (pickupEnd > safeUntilDate) {
      return {
        success: false,
        error: `Pickup deadline (${pickupEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) exceeds the maximum safe holding window (${safeUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Please adjust pickup time.`,
      };
    }

    const effectiveWeightKg = params.measuredKg || params.donorEstimatedKg;
    const estimatedServings = Math.round(effectiveWeightKg / 0.35);

    const quantity: QuantityLedger = {
      donorEstimatedKg: params.donorEstimatedKg,
      servingsEstimate: estimatedServings,
      measuredKg: params.measuredKg,
    };

    const nowIso = new Date().toISOString();
    const newDonation: FoodDonation = {
      id: `don_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      origin: 'user_created',
      donorId: params.donorId,
      donorName: params.donorName,
      donorType: params.donorType,
      donorAddress: params.donorAddress,
      donorLat: params.donorLat,
      donorLng: params.donorLng,
      donorContactPhone: params.donorContactPhone,
      foodName: params.foodName,
      foodCategory: params.foodCategory,
      description: params.description,
      dietaryTags: params.dietaryTags,
      quantity,
      safety,
      pickupWindowStart: params.pickupWindowStart,
      pickupWindowEnd: params.pickupWindowEnd,
      specialHandlingNotes: params.specialHandlingNotes,
      status: 'available',
      timeline: [
        {
          status: 'available',
          timestamp: nowIso,
          actor: params.donorName,
          note: `Surplus published with Food Safety Assessment: ${safety.assessmentOutcome} (${safety.complianceStatus.toUpperCase()}). Est. ${estimatedServings} servings.`,
        },
      ],
      safetyHistory: [
        {
          assessedAt: nowIso,
          newOutcome: safety.assessmentOutcome,
          reasons: safety.assessmentReasons,
          warnings: safety.warnings,
          missingInformation: safety.missingInformation,
          changesSummary: 'Initial food safety assessment generated upon listing creation.',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      photoUrl: params.photoUrl || '/src/assets/images/hero_food_redistribution_1794331332502.jpg',
    };

    const donations = storageAdapter.getDonations();
    donations.unshift(newDonation);
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: newDonation.id,
      entityType: 'donation',
      actorId: params.donorId,
      actorName: params.donorName,
      actorRole: 'donor',
      eventType: 'donation_created',
      metadata: {
        foodName: params.foodName,
        category: params.foodCategory,
        estimatedKg: params.donorEstimatedKg,
        safetyOutcome: safety.assessmentOutcome,
      },
      note: `Surplus food created: ${params.foodName} (${params.donorEstimatedKg} kg)`,
    });

    return { success: true, donation: newDonation };
  }

  /**
   * Edit an existing donation.
   * Only permitted while status is 'available' and before being reserved by an NGO.
   * Automatically triggers a fresh food safety assessment and preserves safety history.
   */
  public updateDonation(
    donationId: string,
    donorId: string,
    params: {
      foodName: string;
      foodCategory: FoodCategory;
      description: string;
      dietaryTags: DietaryTag[];
      donorEstimatedKg: number;
      measuredKg?: number;
      storageCondition: StorageCondition;
      temperatureCelsius?: number;
      temperatureUnit?: TemperatureUnit;
      preparationTimestamp: string;
      isAllergenLabelled: boolean;
      isCleanPackaged: boolean;
      packagingCondition?: PackagingCondition;
      foodHandlingNotes?: string;
      bestBeforeTimestamp?: string;
      pickupWindowStart: string;
      pickupWindowEnd: string;
      specialHandlingNotes?: string;
    }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) {
      return { success: false, error: 'Donation not found.' };
    }

    const item = donations[index];

    const roleCheck = LifecycleManager.validateRolePermission('edit_donation', 'donor');
    if (!roleCheck.allowed) {
      return { success: false, error: roleCheck.error };
    }

    if (item.donorId !== donorId) {
      return { success: false, error: 'Unauthorized: You can only edit your own donations.' };
    }

    if (item.status !== 'available') {
      return {
        success: false,
        error: `Cannot edit listing: Donation is currently '${item.status.replace(/_/g, ' ')}'. Only available listings can be modified.`,
      };
    }

    if (!params.foodName.trim()) {
      return { success: false, error: 'Food name is required.' };
    }

    if (isNaN(params.donorEstimatedKg) || params.donorEstimatedKg <= 0) {
      return { success: false, error: 'Estimated quantity must be greater than 0 kg.' };
    }

    const tempReadingInC = params.temperatureCelsius !== undefined
      ? (params.temperatureUnit === 'fahrenheit' ? convertToCelsius(params.temperatureCelsius, 'fahrenheit') : params.temperatureCelsius)
      : undefined;

    if (tempReadingInC !== undefined && (isNaN(tempReadingInC) || tempReadingInC < -40 || tempReadingInC > 120)) {
      return { success: false, error: 'Recorded temperature must be a realistic reading between -40°C (-40°F) and 120°C (248°F).' };
    }

    // Safety re-evaluation with structured assessment outcomes
    const newSafety = evaluateFoodSafetyAssessment({
      category: params.foodCategory,
      storageCondition: params.storageCondition,
      temperature: params.temperatureCelsius,
      temperatureUnit: params.temperatureUnit || 'celsius',
      preparationTimestamp: params.preparationTimestamp,
      isAllergenLabelled: params.isAllergenLabelled,
      isCleanPackaged: params.isCleanPackaged,
      packagingCondition: params.packagingCondition,
      foodHandlingNotes: params.foodHandlingNotes,
      bestBeforeTimestamp: params.bestBeforeTimestamp,
    });

    if (newSafety.assessmentOutcome === 'REJECTED') {
      return {
        success: false,
        error: `Safety Re-assessment REJECTED: ${newSafety.assessmentReasons.join(' ')}`,
      };
    }

    const effectiveWeightKg = params.measuredKg || params.donorEstimatedKg;
    const estimatedServings = Math.round(effectiveWeightKg / 0.35);

    const oldOutcome = item.safety?.assessmentOutcome;
    const nowIso = new Date().toISOString();

    // Track safety history
    const historyRecord = {
      assessedAt: nowIso,
      previousOutcome: oldOutcome,
      newOutcome: newSafety.assessmentOutcome,
      reasons: newSafety.assessmentReasons,
      warnings: newSafety.warnings,
      missingInformation: newSafety.missingInformation,
      changesSummary: `Food details updated by donor. Storage: ${params.storageCondition}, Temp: ${params.temperatureCelsius !== undefined ? `${params.temperatureCelsius}°C` : 'N/A'}.`,
    };

    item.foodName = params.foodName;
    item.foodCategory = params.foodCategory;
    item.description = params.description;
    item.dietaryTags = params.dietaryTags;
    item.quantity = {
      ...item.quantity,
      donorEstimatedKg: params.donorEstimatedKg,
      servingsEstimate: estimatedServings,
      measuredKg: params.measuredKg,
    };
    item.safety = newSafety;
    item.pickupWindowStart = params.pickupWindowStart;
    item.pickupWindowEnd = params.pickupWindowEnd;
    item.specialHandlingNotes = params.specialHandlingNotes;
    item.safetyHistory = item.safetyHistory || [];
    item.safetyHistory.unshift(historyRecord);

    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'available',
      timestamp: nowIso,
      actor: item.donorName,
      note: `Donation details updated. Food Safety re-assessed: ${newSafety.assessmentOutcome}.`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: donorId,
      actorName: item.donorName,
      actorRole: 'donor',
      eventType: 'donation_updated',
      metadata: {
        foodName: params.foodName,
        estimatedKg: params.donorEstimatedKg,
        safetyOutcome: newSafety.assessmentOutcome,
      },
      note: `Donation details updated by donor. Re-assessment: ${newSafety.assessmentOutcome}`,
    });

    return { success: true, donation: item };
  }

  /**
   * Cancel an existing donation by donor.
   * Permitted when status is 'available', or 'reserved' prior to volunteer pickup.
   * If food has already been picked up ('picked_up', 'in_transit', 'delivered'), cancellation is rejected.
   */
  public cancelDonationByDonor(
    donationId: string,
    donorId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const roleCheck = LifecycleManager.validateRolePermission('cancel_donation', 'donor');
    if (!roleCheck.allowed) {
      return { success: false, error: roleCheck.error };
    }

    const donations = storageAdapter.getDonations();
    const index = donations.findIndex((d) => d.id === donationId);

    if (index === -1) {
      return { success: false, error: 'Donation not found.' };
    }

    const item = donations[index];

    if (item.donorId !== donorId) {
      return { success: false, error: 'Unauthorized: You can only cancel your own donations.' };
    }

    const transitionCheck = LifecycleManager.validateTransition(item.status, 'cancelled_by_donor');
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.error };
    }

    if (['picked_up', 'in_transit', 'delivered'].includes(item.status)) {
      return {
        success: false,
        error: `Cannot cancel: Food has already been collected by volunteer courier (status: ${item.status.replace(/_/g, ' ')}).`,
      };
    }

    if (item.status === 'cancelled_by_donor') {
      return { success: false, error: 'Donation is already cancelled.' };
    }

    item.status = 'cancelled_by_donor';
    item.reservationLock = undefined;
    const nowIso = new Date().toISOString();
    item.updatedAt = nowIso;
    item.timeline.push({
      status: 'cancelled_by_donor',
      timestamp: nowIso,
      actor: item.donorName,
      note: `Donation cancelled by donor. Reason: ${reason || 'Surplus no longer available.'}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

    auditEventRepository.record({
      entityId: item.id,
      entityType: 'donation',
      actorId: donorId,
      actorName: item.donorName,
      actorRole: 'donor',
      eventType: 'donation_cancelled',
      metadata: { reason },
      note: `Donation cancelled by donor. Reason: ${reason || 'Surplus no longer available.'}`,
    });

    return { success: true };
  }

  public getAllDonations(): FoodDonation[] {
    return storageAdapter.getDonations();
  }

  public getDonationsByDonor(donorId: string): FoodDonation[] {
    return storageAdapter.getDonations().filter((d) => d.donorId === donorId);
  }

  public getAvailableDonations(): FoodDonation[] {
    return storageAdapter.getDonations().filter((d) => d.status === 'available');
  }

  public getDonationById(id: string): FoodDonation | undefined {
    return storageAdapter.getDonations().find((d) => d.id === id);
  }

  public getAuditHistory(donationId: string): AuditEvent[] {
    return auditEventRepository.findByEntityId(donationId);
  }
}

export const donationService = new DonationService();
