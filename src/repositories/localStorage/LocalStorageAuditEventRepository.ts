import { AuditEvent } from '../../types';
import { IAuditEventRepository } from '../types';
import { storageAdapter } from '../../services/storageAdapter';

export class LocalStorageAuditEventRepository implements IAuditEventRepository {
  public findAll(): AuditEvent[] {
    return storageAdapter.getAuditEvents();
  }

  public findByEntityId(entityId: string): AuditEvent[] {
    const list = this.findAll();
    return list.filter((e) => e.entityId === entityId);
  }

  public record(
    eventData: Omit<AuditEvent, 'id' | 'timestamp'> & { timestamp?: string }
  ): AuditEvent {
    const fullEvent: AuditEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
    };

    storageAdapter.recordAuditEvent(fullEvent);
    return fullEvent;
  }

  public clear(): void {
    storageAdapter.saveAuditEvents([]);
  }
}

