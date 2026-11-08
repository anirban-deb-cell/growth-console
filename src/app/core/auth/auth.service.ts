import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

/** Turns an API error response into a sentence a user can act on. */
export function apiMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Can’t reach the server. Check your connection and try again.';
    const msg = typeof err.error === 'object' && err.error?.message;
    if (msg) return msg;
  }
  if (err instanceof TimeoutError) return 'The server didn’t respond. Check that it’s running and try again.';
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Admin sign-in. With the real API this is a PHP session (HttpOnly,
 * SameSite=Strict cookie); in sample-data mode everyone is a demo admin.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly mock = environment.dataSource === 'mock';
  readonly user = signal<AdminUser | null>(this.mock ? { id: 0, email: 'demo@example.com', name: 'Demo admin', role: 'admin' } : null);
  private checked = this.mock;

  /** Asks the server who is signed in (once per page load). */
  async ensureChecked(): Promise<AdminUser | null> {
    if (this.checked) return this.user();
    try {
      const res = await firstValueFrom(this.http.get<{ user: AdminUser }>(`${environment.apiBase}/auth/me.php`));
      this.user.set(res.user);
    } catch {
      this.user.set(null);
    }
    this.checked = true;
    return this.user();
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<{ user: AdminUser }>(`${environment.apiBase}/auth/login.php`, { email, password }));
    this.user.set(res.user);
    this.checked = true;
  }

  async logout(): Promise<void> {
    if (!this.mock) {
      await firstValueFrom(this.http.post(`${environment.apiBase}/auth/logout.php`, {})).catch(() => undefined);
    }
    this.user.set(null);
  }

  /** Called when any API call answers 401 (session expired). */
  sessionExpired(): void {
    this.user.set(null);
  }
}
