import { UserProfile } from '../../types';
import { IUserRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';

export class LocalStorageUserRepository implements IUserRepository {
  public findAll(): UserProfile[] {
    return storageAdapter.getUsers();
  }

  public findById(id: string): UserProfile | null {
    const list = this.findAll();
    return list.find((u) => u.id === id) || null;
  }

  public findByEmail(email: string): UserProfile | null {
    const list = this.findAll();
    const normalized = email.trim().toLowerCase();
    return list.find((u) => u.email.trim().toLowerCase() === normalized) || null;
  }

  public create(user: UserProfile): UserProfile {
    const list = this.findAll();
    list.unshift(user);
    storageAdapter.saveUsers(list);
    return user;
  }

  public update(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const list = this.findAll();
    const index = list.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const updated: UserProfile = {
      ...list[index],
      ...updates,
    };

    list[index] = updated;
    storageAdapter.saveUsers(list);
    return updated;
  }

  public saveAll(users: UserProfile[]): void {
    storageAdapter.saveUsers(users);
  }
}

