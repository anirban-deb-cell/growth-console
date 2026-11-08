import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, apiMessage } from './auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <form class="panel" (ngSubmit)="submit()" aria-labelledby="login-title">
        <div class="brand">
          <svg width="40" height="40" viewBox="0 0 34 34" fill="none" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#1550C4"/><path d="M5 18h6l2.5-6 4 11 3-8 2 3h6.5" stroke="#5EE2A8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div><b>MedGrowth Digital</b><span>Admin console</span></div>
        </div>
        <h1 id="login-title">Sign in</h1>
        @if (expired()) { <p class="note">Your session ended. Please sign in again.</p> }

        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="username" required [(ngModel)]="email">
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required [(ngModel)]="password">
        </div>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <button type="submit" class="btn primary" [disabled]="busy() || !email || !password">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
        <p class="help">Forgot your password? Ask an admin to reset it.</p>
      </form>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: radial-gradient(120% 80% at 0% 0%, #17345E, var(--navy) 60%); }
    .panel { width: 100%; max-width: 400px; background: #fff; border-radius: 18px; padding: 32px 28px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, .45); }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .brand div { display: flex; flex-direction: column; }
    .brand b { font-size: 16px; font-weight: 800; }
    .brand span { font-size: 12px; color: var(--muted); }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
    .btn { width: 100%; margin-top: 6px; }
    .error { margin: 0 0 8px; font-size: 13px; color: var(--red-ink); background: var(--red-bg); border-radius: 8px; padding: 10px 12px; }
    .note { margin: 0 0 10px; font-size: 13px; color: var(--amber-ink); background: var(--amber-bg); border-radius: 8px; padding: 10px 12px; }
    .help { margin: 12px 0 0; font-size: 12px; color: var(--muted); text-align: center; }
  `
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Query params via component input binding. */
  next = input<string>();
  expired = input<string>();

  email = '';
  password = '';
  busy = signal(false);
  error = signal('');

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email.trim(), this.password);
      const target = this.next();
      // Only follow in-app paths — never an absolute URL from the query string.
      this.router.navigateByUrl(target && target.startsWith('/') && !target.startsWith('//') ? target : '/');
    } catch (err) {
      this.error.set(apiMessage(err, 'Sign-in failed.'));
      this.password = '';
    } finally {
      this.busy.set(false);
    }
  }
}
