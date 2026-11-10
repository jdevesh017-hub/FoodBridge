/**
 * Storage Adapter for FoodBridge
 * Provides a reactive, transactional-style persistence layer over localStorage
 * with pub/sub event broadcasting. Designed with clean interfaces to allow
 * a direct drop-in replacement with Supabase Client / PostgreSQL RPCs.
 */

import { FoodDonation, UserProfile, UserRole } from '../types';
import { SEED_DONATIONS, SEED_USERS } from './seedData';

const DONATIONS_STORAGE_KEY = 'foodbridge_donations_v1';
const USERS_STORAGE_KEY = 'foodbridge_users_v1';
const ACTIVE_USER_STORAGE_KEY = 'foodbridge_active_user_v1';
const CHANGE_EVENT = 'foodbridge_storage_change';

type StorageListener = () => void;

class StorageAdapter {
  private listeners: Set<StorageListener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(DONATIONS_STORAGE_KEY)) {
      localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(SEED_DONATIONS));
    }

    if (!localStorage.getItem(USERS_STORAGE_KEY)) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEED_USERS));
    }

    if (!localStorage.getItem(ACTIVE_USER_STORAGE_KEY)) {
      // Default to public/visitor, but keep demo credentials ready
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify({
        role: 'public',
        profile: null,
      }));
    }
  }

  public subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key?.startsWith('foodbridge_')) {
        listener();
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener(CHANGE_EVENT, listener);

    return () => {
      this.listeners.delete(listener);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener(CHANGE_EVENT, listener);
    };
  }

  private notify(): void {
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
      const raw = localStorage.getItem(DONATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : SEED_DONATIONS;
    } catch {
      return SEED_DONATIONS;
    }
  }

  public saveDonations(donations: FoodDonation[]): void {
    try {
      localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(donations));
      this.notify();
    } catch (err) {
      console.error('Failed to save donations to localStorage:', err);
    }
  }

  // --- Users Storage ---

  public getUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  }

  public saveUsers(users: UserProfile[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      this.notify();
    } catch (err) {
      console.error('Failed to save users to localStorage:', err);
    }
  }

  // --- Active Session ---

  public getSession(): { role: UserRole; profile: UserProfile | null } {
    try {
      const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return { role: 'public', profile: null };
  }

  public setSession(role: UserRole, profile: UserProfile | null): void {
    try {
      localStorage.setItem(
        ACTIVE_USER_STORAGE_KEY,
        JSON.stringify({ role, profile })
      );
      this.notify();
    } catch (err) {
      console.error('Failed to set session:', err);
    }
  }

  // --- Reset to initial state ---

  public resetToSeed(): void {
    localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(SEED_DONATIONS));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEED_USERS));
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify({ role: 'public', profile: null }));
    this.notify();
  }
}

export const storageAdapter = new StorageAdapter();
