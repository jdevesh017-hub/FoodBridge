/**
 * FoodBridge Repository Interfaces
 * Defined as abstract data access contracts separating business logic
 * from physical persistence.
 *
 * Designed for a seamless, 1:1 drop-in replacement with Supabase Client /
 * PostgreSQL PostgREST tables when graduating from prototype to production.
 */

import {
  DiscrepancyReport,
  FoodCategory,
  FoodDonation,
  NgoDemandRequest,
  UserProfile,
  UserRole,
  AuditEvent,
} from '../types';

export interface IDonationRepository {
  findAll(): FoodDonation[];
  findById(id: string): FoodDonation | null;
  create(donation: FoodDonation): FoodDonation;
  update(id: string, updates: Partial<FoodDonation>): FoodDonation | null;
  delete(id: string): boolean;
  filter(predicate: (d: FoodDonation) => boolean): FoodDonation[];
  saveAll(donations: FoodDonation[]): void;
}

export interface IUserRepository {
  findAll(): UserProfile[];
  findById(id: string): UserProfile | null;
  findByEmail(email: string): UserProfile | null;
  create(user: UserProfile): UserProfile;
  update(id: string, updates: Partial<UserProfile>): UserProfile | null;
  saveAll(users: UserProfile[]): void;
}

export interface IReservationRepository {
  acquireLock(
    donationId: string,
    ngoId: string,
    leaseSeconds?: number
  ): { success: boolean; error?: string };
  releaseLock(donationId: string, ngoId: string): { success: boolean; error?: string };
  confirmReservation(
    donationId: string,
    ngo: { id: string; name: string; address: string; lat: number; lng: number }
  ): { success: boolean; donation?: FoodDonation; error?: string };
  releaseReservation(donationId: string, ngoName: string): { success: boolean; error?: string };
}

export interface IDeliveryRepository {
  getAvailableTasks(
    volunteerLocation?: { lat: number; lng: number },
    maxDistanceKm?: number
  ): FoodDonation[];
  getMyActiveDeliveries(volunteerId: string): FoodDonation[];
  getMyDeliveryHistory(volunteerId: string): FoodDonation[];
  acceptTask(
    donationId: string,
    volunteer: { id: string; name: string; phone: string }
  ): { success: boolean; donation?: FoodDonation; error?: string };
  confirmArrivalAtDonor(
    donationId: string,
    volunteerName: string
  ): { success: boolean; error?: string };
  confirmPickup(
    donationId: string,
    volunteerName: string,
    confirmedKg: number,
    notes?: string
  ): { success: boolean; donation?: FoodDonation; error?: string };
  confirmArrivalAtNgo(
    donationId: string,
    volunteerName: string
  ): { success: boolean; error?: string };
  confirmReceipt(
    donationId: string,
    ngoName: string,
    params: {
      receivedKg: number;
      receivingSupervisorName: string;
      notes?: string;
    }
  ): { success: boolean; donation?: FoodDonation; error?: string };
  reportPickupFailure(
    donationId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string };
  cancelAssignment(
    donationId: string,
    volunteerName: string,
    reason: string
  ): { success: boolean; error?: string };
  reportDiscrepancy(
    donationId: string,
    report: DiscrepancyReport
  ): { success: boolean; error?: string };
}

export interface IAuditEventRepository {
  findAll(): AuditEvent[];
  findByEntityId(entityId: string): AuditEvent[];
  record(
    event: Omit<AuditEvent, 'id' | 'timestamp'> & { timestamp?: string }
  ): AuditEvent;
  clear(): void;
}

export interface IDemandRepository {
  findAll(): NgoDemandRequest[];
  findById(id: string): NgoDemandRequest | null;
  findByNgoId(ngoId: string): NgoDemandRequest[];
  create(demand: NgoDemandRequest): NgoDemandRequest;
  update(id: string, updates: Partial<NgoDemandRequest>): NgoDemandRequest | null;
  saveAll(demands: NgoDemandRequest[]): void;
}

