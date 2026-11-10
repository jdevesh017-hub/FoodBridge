/**
 * FoodBridge Authentication & Identity Service
 * Handles user sign-in, role registration with tailored schema validation,
 * session management, and quick-switch demonstration personas.
 */

import { UserProfile, UserRole } from '../types';
import { storageAdapter } from './storageAdapter';

export class AuthService {
  public getCurrentSession(): { role: UserRole; profile: UserProfile | null } {
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
    serviceRadiusKm?: number;
  }): { success: boolean; user?: UserProfile; error?: string } {
    if (!params.email || !params.fullName || !params.phone || !params.address) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    if (params.role === 'ngo' && !params.organizationName) {
      return { success: false, error: 'Organization name is required for NGO registration.' };
    }

    if (params.role === 'donor' && !params.organizationName) {
      return { success: false, error: 'Donor establishment name is required.' };
    }

    const users = storageAdapter.getUsers();
    if (users.some((u) => u.email.toLowerCase() === params.email.toLowerCase())) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    // Default coordinates based on downtown Mumbai demo zone with subtle jitter
    const baseLat = 19.0760 + (Math.random() - 0.5) * 0.04;
    const baseLng = 72.8777 + (Math.random() - 0.5) * 0.04;

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: params.email,
      role: params.role,
      fullName: params.fullName,
      organizationName: params.organizationName,
      organizationType: params.organizationType,
      ngoRegistrationNumber: params.ngoRegistrationNumber,
      phone: params.phone,
      address: params.address,
      lat: Math.round(baseLat * 10000) / 10000,
      lng: Math.round(baseLng * 10000) / 10000,
      verified: true,
      serviceRadiusKm: params.serviceRadiusKm || (params.role === 'volunteer' ? 10 : undefined),
    };

    users.push(newUser);
    storageAdapter.saveUsers(users);
    storageAdapter.setSession(params.role, newUser);

    return { success: true, user: newUser };
  }

  public signInWithDemoPersona(role: 'donor' | 'ngo' | 'volunteer' | 'public'): UserProfile | null {
    if (role === 'public') {
      storageAdapter.setSession('public', null);
      return null;
    }

    const users = storageAdapter.getUsers();
    let targetUser: UserProfile | undefined;

    if (role === 'donor') {
      targetUser = users.find((u) => u.id === 'donor_grand_meridian') || users.find((u) => u.role === 'donor');
    } else if (role === 'ngo') {
      targetUser = users.find((u) => u.id === 'ngo_hope_kitchen') || users.find((u) => u.role === 'ngo');
    } else if (role === 'volunteer') {
      targetUser = users.find((u) => u.id === 'volunteer_alex') || users.find((u) => u.role === 'volunteer');
    }

    if (targetUser) {
      storageAdapter.setSession(role, targetUser);
      return targetUser;
    }
    return null;
  }

  public signOut(): void {
    storageAdapter.setSession('public', null);
  }
}

export const authService = new AuthService();
