/**
 * Storage Adapter for FoodBridge (Version 2)
 * Provides schema-versioned, transactional-style persistence layer over localStorage
 * with automatic migrations, malformed record validation, quota-exceeded guards,
 * in-memory fallback, and dedicated audit log storage.
 *
 * Prepared for drop-in migration to PostgreSQL / Supabase Client.
 */

import { FoodDonation, UserProfile, UserRole, NgoDemandRequest, AuditEvent } from '../types';
import { SEED_DONATIONS, SEED_USERS, SEED_DEMAND_REQUESTS } from './seedData';

export const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'foodbridge_schema_version_v2';
const DONATIONS_STORAGE_KEY = 'foodbridge_donations_v2';
const USERS_STORAGE_KEY = 'foodbridge_users_v2';
const ACTIVE_USER_STORAGE_KEY = 'foodbridge_active_user_v2';
const DEMANDS_STORAGE_KEY = 'foodbridge_demands_v2';
const AUDIT_STORAGE_KEY = 'foodbridge_audit_events_v2';
const CHANGE_EVENT = 'foodbridge_storage_change';

// Legacy v1 keys for automatic migration
const LEGACY_DONATIONS_KEY = 'foodbridge_donations_v1';
const LEGACY_USERS_KEY = 'foodbridge_users_v1';
const LEGACY_ACTIVE_USER_KEY = 'foodbridge_active_user_v1';
const LEGACY_DEMANDS_KEY = 'foodbridge_demands_v1';

type StorageListener = () => void;

class StorageAdapter {
  private listeners: Set<StorageListener> = new Set();
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Safe localStorage wrapper with memory fallback for quota limits or SSR/Node.
   */
  private safeGetItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Failed to read key ${key} from localStorage, using memory cache:`, e);
    }
    return this.memoryCache.get(key) || null;
  }

  private safeSetItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e: any) {
      console.warn(`[StorageAdapter] localStorage quota exceeded or unavailable. Storing key ${key} in memory cache:`, e);
    }
    this.memoryCache.set(key, value);
  }

  /**
   * Versioned schema initialization and migration handling.
   */
  private ensureInitialized(): void {
    if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;

    const currentVersionStr = this.safeGetItem(SCHEMA_VERSION_KEY);
    const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;

    if (currentVersion < SCHEMA_VERSION) {
      this.migrateFromLegacy(currentVersion);
      this.safeSetItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
    }

    // Initialize missing keys with defaults
    if (!this.safeGetItem(DONATIONS_STORAGE_KEY)) {
      this.safeSetItem(DONATIONS_STORAGE_KEY, JSON.stringify(SEED_DONATIONS));
    }

    if (!this.safeGetItem(USERS_STORAGE_KEY)) {
      this.safeSetItem(USERS_STORAGE_KEY, JSON.stringify(SEED_USERS));
    }

    if (!this.safeGetItem(DEMANDS_STORAGE_KEY)) {
      this.safeSetItem(DEMANDS_STORAGE_KEY, JSON.stringify(SEED_DEMAND_REQUESTS));
    }

    if (!this.safeGetItem(AUDIT_STORAGE_KEY)) {
      this.safeSetItem(AUDIT_STORAGE_KEY, JSON.stringify([]));
    }

    if (!this.safeGetItem(ACTIVE_USER_STORAGE_KEY)) {
      this.safeSetItem(
        ACTIVE_USER_STORAGE_KEY,
        JSON.stringify({
          role: 'public',
          profile: null,
          isDemoMode: false,
        })
      );
    }
  }

  /**
   * Migrates legacy v1 records to v2 schemas, sanitizing malformed records.
   */
  private migrateFromLegacy(fromVersion: number): void {
    try {
      console.info(`[StorageAdapter] Running automatic storage migration from v${fromVersion} to v${SCHEMA_VERSION}...`);

      // 1. Migrate Donations
      const rawLegacyDonations = this.safeGetItem(LEGACY_DONATIONS_KEY);
      if (rawLegacyDonations) {
        try {
          const parsed = JSON.parse(rawLegacyDonations);
          if (Array.isArray(parsed)) {
            // Validate and sanitize each record
            const sanitized = parsed.filter((d: any) => d && typeof d === 'object' && d.id && d.foodName);
            this.safeSetItem(DONATIONS_STORAGE_KEY, JSON.stringify(sanitized));
          }
        } catch (e) {
          console.error('[StorageAdapter] Legacy donations migration parse error:', e);
        }
      }

      // 2. Migrate Users
      const rawLegacyUsers = this.safeGetItem(LEGACY_USERS_KEY);
      if (rawLegacyUsers) {
        try {
          const parsed = JSON.parse(rawLegacyUsers);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.filter((u: any) => u && typeof u === 'object' && u.id && u.email);
            this.safeSetItem(USERS_STORAGE_KEY, JSON.stringify(sanitized));
          }
        } catch (e) {
          console.error('[StorageAdapter] Legacy users migration parse error:', e);
        }
      }

      // 3. Migrate Demands
      const rawLegacyDemands = this.safeGetItem(LEGACY_DEMANDS_KEY);
      if (rawLegacyDemands) {
        try {
          const parsed = JSON.parse(rawLegacyDemands);
          if (Array.isArray(parsed)) {
            this.safeSetItem(DEMANDS_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('[StorageAdapter] Legacy demands migration parse error:', e);
        }
      }

      // 4. Migrate Session
      const rawLegacySession = this.safeGetItem(LEGACY_ACTIVE_USER_KEY);
      if (rawLegacySession) {
        this.safeSetItem(ACTIVE_USER_STORAGE_KEY, rawLegacySession);
      }
    } catch (err) {
      console.error('[StorageAdapter] Migration failed, maintaining safe fallback:', err);
    }
  }

  public subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key?.startsWith('foodbridge_')) {
        listener();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener(CHANGE_EVENT, listener);
    }

    return () => {
      this.listeners.delete(listener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener(CHANGE_EVENT, listener);
      }
    };
  }

  public notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Storage listener error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }
  }

  // --- Donations Storage ---

  public getDonations(): FoodDonation[] {
    try {
      const raw = this.safeGetItem(DONATIONS_STORAGE_KEY);
      if (!raw) return SEED_DONATIONS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return SEED_DONATIONS;
      // Filter out malformed records safely
      return parsed.filter((d: any) => d && typeof d === 'object' && d.id && d.status);
    } catch (err) {
      console.error('[StorageAdapter] Malformed donations in storage, reverting to seed baseline:', err);
      return SEED_DONATIONS;
    }
  }

  public saveDonations(donations: FoodDonation[]): void {
    try {
      this.safeSetItem(DONATIONS_STORAGE_KEY, JSON.stringify(donations));
      this.notify();
    } catch (err) {
      console.error('[StorageAdapter] Failed to save donations:', err);
    }
  }

  // --- Users Storage ---

  public getUsers(): UserProfile[] {
    try {
      const raw = this.safeGetItem(USERS_STORAGE_KEY);
      if (!raw) return SEED_USERS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return SEED_USERS;
      return parsed.filter((u: any) => u && typeof u === 'object' && u.id && u.role);
    } catch (err) {
      console.error('[StorageAdapter] Malformed users in storage:', err);
      return SEED_USERS;
    }
  }

  public saveUsers(users: UserProfile[]): void {
    try {
      this.safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));
      this.notify();
    } catch (err) {
      console.error('[StorageAdapter] Failed to save users:', err);
    }
  }

  // --- Active Session ---

  public getSession(): { role: UserRole; profile: UserProfile | null; isDemoMode: boolean } {
    try {
      const raw = this.safeGetItem(ACTIVE_USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return { role: 'public', profile: null, isDemoMode: false };
  }

  public setSession(role: UserRole, profile: UserProfile | null, isDemoMode = false): void {
    try {
      this.safeSetItem(
        ACTIVE_USER_STORAGE_KEY,
        JSON.stringify({ role, profile, isDemoMode })
      );
      this.notify();
    } catch (err) {
      console.error('[StorageAdapter] Failed to set session:', err);
    }
  }

  // --- NGO Demand Requests Storage ---

  public getDemandRequests(): NgoDemandRequest[] {
    try {
      const raw = this.safeGetItem(DEMANDS_STORAGE_KEY);
      if (!raw) return SEED_DEMAND_REQUESTS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : SEED_DEMAND_REQUESTS;
    } catch {
      return SEED_DEMAND_REQUESTS;
    }
  }

  public saveDemandRequests(demands: NgoDemandRequest[]): void {
    try {
      this.safeSetItem(DEMANDS_STORAGE_KEY, JSON.stringify(demands));
      this.notify();
    } catch (err) {
      console.error('[StorageAdapter] Failed to save demand requests:', err);
    }
  }

  public addDemandRequest(demand: NgoDemandRequest): void {
    const list = this.getDemandRequests();
    list.unshift(demand);
    this.saveDemandRequests(list);
  }

  // --- Audit Events Storage ---

  public getAuditEvents(): AuditEvent[] {
    try {
      const raw = this.safeGetItem(AUDIT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveAuditEvents(events: AuditEvent[]): void {
    try {
      this.safeSetItem(AUDIT_STORAGE_KEY, JSON.stringify(events));
      this.notify();
    } catch (err) {
      console.error('[StorageAdapter] Failed to save audit events:', err);
    }
  }

  public recordAuditEvent(event: AuditEvent): void {
    const events = this.getAuditEvents();
    events.unshift(event);
    // Keep last 500 audit events in local storage buffer
    if (events.length > 500) {
      events.length = 500;
    }
    this.saveAuditEvents(events);
  }

  // --- Demo Data vs User Data Isolation & Reset ---

  /**
   * Resets curated demo records to initial baseline WITHOUT deleting
   * user-created donations, custom registered users, or user demands.
   */
  public resetDemoData(): void {
    // 1. Preserve user-created donations
    const currentDonations = this.getDonations();
    const userDonations = currentDonations.filter((d) => d.origin === 'user_created');
    this.saveDonations([...SEED_DONATIONS, ...userDonations]);

    // 2. Preserve non-demo registered users
    const currentUsers = this.getUsers();
    const userProfiles = currentUsers.filter((u) => !u.isDemoUser);
    this.saveUsers([...SEED_USERS, ...userProfiles]);

    // 3. Reset demands
    this.saveDemandRequests([...SEED_DEMAND_REQUESTS]);

    this.notify();
    console.info('[StorageAdapter] Curated demo records reset to seed baseline. User-created records preserved.');
  }

  /**
   * Hard reset for testing or factory reset.
   */
  public resetAll(): void {
    this.safeSetItem(DONATIONS_STORAGE_KEY, JSON.stringify(SEED_DONATIONS));
    this.safeSetItem(USERS_STORAGE_KEY, JSON.stringify(SEED_USERS));
    this.safeSetItem(DEMANDS_STORAGE_KEY, JSON.stringify(SEED_DEMAND_REQUESTS));
    this.safeSetItem(AUDIT_STORAGE_KEY, JSON.stringify([]));
    this.safeSetItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify({ role: 'public', profile: null, isDemoMode: false }));
    this.notify();
  }
}

export const storageAdapter = new StorageAdapter();
