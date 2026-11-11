import { NgoDemandRequest } from '../../types';
import { IDemandRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';

export class LocalStorageDemandRepository implements IDemandRepository {
  public findAll(): NgoDemandRequest[] {
    return storageAdapter.getDemandRequests();
  }

  public findById(id: string): NgoDemandRequest | null {
    const list = this.findAll();
    return list.find((d) => d.id === id) || null;
  }

  public findByNgoId(ngoId: string): NgoDemandRequest[] {
    const list = this.findAll();
    return list.filter((d) => d.ngoId === ngoId);
  }

  public create(demand: NgoDemandRequest): NgoDemandRequest {
    storageAdapter.addDemandRequest(demand);
    return demand;
  }

  public update(id: string, updates: Partial<NgoDemandRequest>): NgoDemandRequest | null {
    const list = this.findAll();
    const index = list.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const updated: NgoDemandRequest = {
      ...list[index],
      ...updates,
    };

    list[index] = updated;
    storageAdapter.saveDemandRequests(list);
    return updated;
  }

  public saveAll(demands: NgoDemandRequest[]): void {
    storageAdapter.saveDemandRequests(demands);
  }
}

