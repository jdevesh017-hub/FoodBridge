import { FoodDonation } from '../../types';
import { IDonationRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';

export class LocalStorageDonationRepository implements IDonationRepository {
  public findAll(): FoodDonation[] {
    return storageAdapter.getDonations();
  }

  public findById(id: string): FoodDonation | null {
    const list = this.findAll();
    return list.find((d) => d.id === id) || null;
  }

  public create(donation: FoodDonation): FoodDonation {
    const list = this.findAll();
    list.unshift(donation);
    storageAdapter.saveDonations(list);
    return donation;
  }

  public update(id: string, updates: Partial<FoodDonation>): FoodDonation | null {
    const list = this.findAll();
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const updated: FoodDonation = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storageAdapter.saveDonations(list);
    return updated;
  }

  public delete(id: string): boolean {
    const list = this.findAll();
    const filtered = list.filter((d) => d.id !== id);
    if (filtered.length === list.length) return false;

    storageAdapter.saveDonations(filtered);
    return true;
  }

  public filter(predicate: (d: FoodDonation) => boolean): FoodDonation[] {
    return this.findAll().filter(predicate);
  }

  public saveAll(donations: FoodDonation[]): void {
    storageAdapter.saveDonations(donations);
  }
}

