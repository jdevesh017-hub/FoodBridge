/**
 * FoodBridge Authentication & Identity Service
 * Handles user sign-in, role registration with tailored schema validation,
 * session management, and quick-switch demonstration personas.
 */

import { UserProfile, UserRole } from '../types';
import { storageAdapter } from './storageAdapter';

export class AuthService {
  public getCurrentSession(): { role: UserRole; profile: UserProfile | null; isDemoMode: boolean } {
    return storageAdapter.getSession();
  }

  public register(params: {
    email: string;
    role: UserRole;
    fullName: string;
    organizationName?: string;
    organizationType?: string;
    ngoRegistrationNumber?: string;
    phone: string;
    address: string;
    lat?: number;
    lng?: number;
    serviceRadiusKm?: number;
  }): { success: boolean; user?: UserProfile; error?: string } {
    if (!params.email || !params.fullName || !params.phone || !params.address) {
      return { success: false, error: 'Please fill in all required fields (Name, Email, Phone, Address).' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (params.role === 'ngo' && !params.organizationName) {
      return { success: false, error: 'Organization name is required for NGO registration.' };
    }

    if (params.role === 'ngo' && !params.ngoRegistrationNumber) {
      return { success: false, error: 'NGO registration number is required for verification audit.' };
    }

    if (params.role === 'donor' && !params.organizationName) {
      return { success: false, error: 'Donor establishment name is required.' };
    }

    const users = storageAdapter.getUsers();
    if (users.some((u) => u.email.toLowerCase() === params.email.trim().toLowerCase())) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    // Require actual coordinates entered or selected by user
    if (
      params.lat === undefined ||
      params.lng === undefined ||
      isNaN(params.lat) ||
      isNaN(params.lng) ||
      params.lat < -90 ||
      params.lat > 90 ||
      params.lng < -180 ||
      params.lng > 180
    ) {
      return {
        success: false,
        error: 'Please specify valid geographic coordinates (Latitude between -90 and 90, Longitude between -180 and 180) or select your location.',
      };
    }

    // Newly registered users are NOT automatically marked as verified
    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: params.email.trim(),
      role: params.role,
      fullName: params.fullName.trim(),
      organizationName: params.organizationName?.trim(),
      organizationType: params.organizationType,
      ngoRegistrationNumber: params.ngoRegistrationNumber?.trim(),
      phone: params.phone.trim(),
      address: params.address.trim(),
      lat: Math.round(params.lat * 10000) / 10000,
      lng: Math.round(params.lng * 10000) / 10000,
      verified: false, // Explicit: pending verification, not automatically verified!
      isDemoUser: false,
      serviceRadiusKm: params.serviceRadiusKm || (params.role === 'volunteer' ? 10 : undefined),
    };

    users.push(newUser);
    storageAdapter.saveUsers(users);
    // Real registered user session: isDemoMode is false
    storageAdapter.setSession(params.role, newUser, false);

    return { success: true, user: newUser };
  }

  public signIn(email: string): { success: boolean; user?: UserProfile; error?: string } {
    if (!email || !email.trim()) {
      return { success: false, error: 'Please enter your email address to sign in.' };
    }

    const users = storageAdapter.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return {
        success: false,
        error: 'No registered account found with this email. Please register or choose a Demo Persona below.',
      };
    }

    storageAdapter.setSession(user.role, user, !!user.isDemoUser);
    return { success: true, user };
  }

  public signInWithDemoPersona(role: 'donor' | 'ngo' | 'volunteer' | 'public'): UserProfile | null {
    if (role === 'public') {
      storageAdapter.setSession('public', null, false);
      return null;
    }

    const users = storageAdapter.getUsers();
    let targetUser: UserProfile | undefined;

    if (role === 'donor') {
      targetUser = users.find((u) => u.id === 'donor_grand_meridian') || users.find((u) => u.role === 'donor' && u.isDemoUser);
    } else if (role === 'ngo') {
      targetUser = users.find((u) => u.id === 'ngo_hope_kitchen') || users.find((u) => u.role === 'ngo' && u.isDemoUser);
    } else if (role === 'volunteer') {
      targetUser = users.find((u) => u.id === 'volunteer_alex') || users.find((u) => u.role === 'volunteer' && u.isDemoUser);
    }

    if (targetUser) {
      storageAdapter.setSession(role, targetUser, true);
      return targetUser;
    }
    return null;
  }

  public signOut(): void {
    storageAdapter.setSession('public', null, false);
  }
}

export const authService = new AuthService();
