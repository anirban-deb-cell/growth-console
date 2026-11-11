import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LEADS } from '../../core/data/mock-data';
import { Lead, LeadStatus } from '../../core/data/models';

/**
 * Enquiries from campaign landing pages. Like the other repositories, the
 * `dataSource` setting in src/environments picks the PHP API or sample data.
 */
export abstract class LeadRepository {
  abstract readonly mode: 'api' | 'mock';
  abstract list(): Promise<Lead[]>;
  /** Moves an enquiry along the pipeline and/or saves notes. */
  abstract update(id: string, patch: { status?: LeadStatus; notes?: string }): Promise<Lead>;
  /** Permanently removes an enquiry (spam, or a deletion request). Admin only. */
  abstract remove(id: string): Promise<void>;
}

@Injectable()
export class HttpLeadRepository extends LeadRepository {
  readonly mode = 'api' as const;
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/leads`;

  async list(): Promise<Lead[]> {
    const res = await firstValueFrom(this.http.get<{ leads: Lead[] }>(`${this.base}/list.php`));
    return res.leads;
  }

  async update(id: string, patch: { status?: LeadStatus; notes?: string }): Promise<Lead> {
    const res = await firstValueFrom(this.http.post<{ lead: Lead }>(`${this.base}/update.php`, { id, ...patch }));
    return res.lead;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/delete.php`, { id }));
  }
}

/** Sample-data mode: a few made-up enquiries, kept in memory for this tab. */
@Injectable()
export class MockLeadRepository extends LeadRepository {
  readonly mode = 'mock' as const;
  private leads = LEADS.map((l) => ({ ...l }));

  async list(): Promise<Lead[]> {
    return this.leads.map((l) => ({ ...l }));
  }

  async update(id: string, patch: { status?: LeadStatus; notes?: string }): Promise<Lead> {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) throw new Error('Enquiry not found.');
    Object.assign(lead, patch, { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    return { ...lead };
  }

  async remove(id: string): Promise<void> {
    this.leads = this.leads.filter((l) => l.id !== id);
  }
}

export function provideLeadRepository() {
  return { provide: LeadRepository, useClass: environment.dataSource === 'api' ? HttpLeadRepository : MockLeadRepository };
}
