/**
 * FoodBridge Donation Service
 * Encapsulates all donation operations, atomic reservation locking,
 * timeline auditing, 4-tier quantity tracking, and FSSAI safety evaluations.
 */

import { DonationStatus, FoodCategory, FoodDonation, QuantityLedger, StorageCondition, DietaryTag } from '../types';
import { evaluateFssaiFoodSafety } from './fssaiSafetyRules';
import { storageAdapter } from './storageAdapter';

export class DonationService {
  /**
   * Acquire atomic lock on a donation to prevent concurrent double-booking.
   * In a future Supabase integration, this maps to:
   * SELECT * FROM donations WHERE id = $1 FOR UPDATE
   */
  public acquireReservationLock(donationId: string, ngoId: string, leaseSeconds = 60): { success: boolean; error?: string } {
    const donations = storageAdapter.getDonations();
    const target = donations.find((d) => d.id === donationId);

    if (!target) {
      return { success: false, error: 'Donation not found.' };
    }

    if (target.status !== 'available') {
      return {
        success: false,
        error: `Donation is no longer available (currently ${target.status.replace('_', ' ')}).`,
      };
    }

    // Check if an unexpired lock exists for another user
    const now = new Date();
    if (target.reservationLock) {
      const expires = new Date(target.reservationLock.lockExpiresAt);
      if (expires > now && target.reservationLock.leaseHolderId !== ngoId) {
        return {
          success: false,
          error: 'Another community organization is currently reviewing and locking this donation.',
        };
      }
    }

    // Grant temporary lease
    const expiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
    target.reservationLock = {
      lockedAt: now.toISOString(),
      lockExpiresAt: expiresAt,
      leaseHolderId: ngoId,
    };

    storageAdapter.saveDonations(donations);
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
    }
  ): { success: boolean; donation?: FoodDonation; error?: string } {
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
        error: `Cannot reserve: Donation is already ${item.status}. Another organization may have just claimed it.`,
      };
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
      note: 'Donation reserved for community redistribution. Awaiting volunteer pickup assignment.',
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);

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

    if (item.status !== 'reserved') {
      return { success: false, error: `Cannot release donation with status ${item.status}` };
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
      note: `Reservation cancelled by NGO. ${reason ? `Reason: ${reason}` : 'Returned to available pool.'}`,
    });

    donations[index] = item;
    storageAdapter.saveDonations(donations);
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
    preparationTimestamp: string;
    isAllergenLabelled: boolean;
    isCleanPackaged: boolean;
    pickupWindowStart: string;
    pickupWindowEnd: string;
    specialHandlingNotes?: string;
    photoUrl?: string;
  }): { success: boolean; donation?: FoodDonation; error?: string } {
    if (!params.foodName.trim()) {
      return { success: false, error: 'Food name is required.' };
    }
    if (params.donorEstimatedKg <= 0) {
      return { success: false, error: 'Please enter a valid surplus quantity in kilograms.' };
    }

    // Run FSSAI Safety rule evaluation
    const safety = evaluateFssaiFoodSafety({
      category: params.foodCategory,
      storageCondition: params.storageCondition,
      temperatureCelsius: params.temperatureCelsius,
      preparationTimestamp: params.preparationTimestamp,
      isAllergenLabelled: params.isAllergenLabelled,
      isCleanPackaged: params.isCleanPackaged,
    });

    if (safety.complianceStatus === 'rejected_unsafe') {
      return {
        success: false,
        error: `FSSAI Safety Validation Failed: ${safety.safetyNotes.join(' ')}`,
      };
    }

    const effectiveWeightKg = params.measuredKg || params.donorEstimatedKg;
    const estimatedServings = Math.round(effectiveWeightKg / 0.35); // 350g standard meal portion

    const quantity: QuantityLedger = {
      donorEstimatedKg: params.donorEstimatedKg,
      servingsEstimate: estimatedServings,
      measuredKg: params.measuredKg,
    };

    const nowIso = new Date().toISOString();
    const newDonation: FoodDonation = {
      id: `don_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      origin: 'user_created', // user created, tracks in live metrics!
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
          note: `Surplus published with FSSAI status: ${safety.complianceStatus.toUpperCase()}. Est. ${estimatedServings} servings.`,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      photoUrl: params.photoUrl || '/src/assets/images/hero_food_redistribution_1794331332502.jpg',
    };

    const donations = storageAdapter.getDonations();
    donations.unshift(newDonation);
    storageAdapter.saveDonations(donations);

    return { success: true, donation: newDonation };
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
}

export const donationService = new DonationService();
