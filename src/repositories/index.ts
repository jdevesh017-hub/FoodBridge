/**
 * FoodBridge Repository Registry
 * Exposes repository singletons implementing the abstract repository interfaces.
 *
 * To integrate with Supabase / PostgreSQL in the future, simply swap these instances
 * with SupabaseRepository implementations without rewriting business services or React views.
 */

import { LocalStorageDonationRepository } from './localStorage/LocalStorageDonationRepository';
import { LocalStorageUserRepository } from './localStorage/LocalStorageUserRepository';
import { LocalStorageAuditEventRepository } from './localStorage/LocalStorageAuditEventRepository';
import { LocalStorageDemandRepository } from './localStorage/LocalStorageDemandRepository';
import {
  IDonationRepository,
  IUserRepository,
  IAuditEventRepository,
  IDemandRepository,
} from './types';

export * from './types';

export const donationRepository: IDonationRepository = new LocalStorageDonationRepository();
export const userRepository: IUserRepository = new LocalStorageUserRepository();
export const auditEventRepository: IAuditEventRepository = new LocalStorageAuditEventRepository();
export const demandRepository: IDemandRepository = new LocalStorageDemandRepository();

