import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FEATURES, moduleEnabled } from '../config/features';
import { ClientStore } from '../data/stores';
import { CLIENT_MODULES } from '../modules/module-registry';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="brand">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#1550C4"/><path d="M5 18h6l2.5-6 4 11 3-8 2 3h6.5" stroke="#5EE2A8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div><b>MedGrowth Digital</b><span>Agency workspace</span></div>
    </div>

    @if (features.clientSwitcher) {
    <div class="switcher-wrap">
      <button type="button" class="switcher" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-haspopup="listbox">
        <span class="sw-text">
          <span class="sw-label">Viewing client</span>
          <span class="sw-title">{{ clients.current().name }}</span>
          <span class="sw-meta">{{ clients.current().branches.length }} {{ clients.current().branches.length === 1 ? 'branch' : 'branches' }} · {{ clients.current().city }}</span>
        </span>
        <app-icon name="chevrons" [size]="16" />
      </button>
      @if (menuOpen()) {
        <ul class="menu" role="listbox" aria-label="Clients">
          @for (c of clients.clients(); track c.id) {
            <li>
              <button type="button" role="option" [attr.aria-selected]="c.id === clients.currentId()" [class.on]="c.id === clients.currentId()" (click)="pick(c.id)">
                <span class="mi">{{ c.initials }}</span>{{ c.name }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
    } @else {
      <div class="site">
        <span class="sw-label">Website</span>
        <a [href]="'https://' + clients.current().website" target="_blank" rel="noopener">{{ clients.current().website }} ↗</a>
      </div>
    }

    <nav aria-label="Main">
      @if (features.portfolio) {
        <span class="group">Agency</span>
        <a routerLink="/portfolio" routerLinkActive="on" class="item">
          <app-icon name="briefcase" /> Client portfolio <span class="count num">{{ clients.clients().length }}</span>
        </a>
      }

      <span class="group">{{ features.portfolio ? 'Client' : 'Content' }}</span>
      @for (m of modules(); track m.key) {
        <a [routerLink]="m.nav.path" routerLinkActive="on" class="item">
          <app-icon [name]="m.nav.icon" /> {{ m.nav.label }}
          @if (m.nav.badge) { <span class="badge" [class]="m.nav.badgeTone">{{ m.nav.badge }}</span> }
        </a>
        @if (m.nav.children && isSection(m.nav.path)) {
          <div class="sub">
            @for (s of m.nav.children; track s.path) {
              <a [routerLink]="s.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">{{ s.label }}</a>
            }
          </div>
        }
      }
    </nav>

    <div class="foot">
      @if (auth.user(); as u) {
        <div class="me">
          <span class="avatar">{{ initials(u.name) }}</span>
          <div><b>{{ u.name }}</b><span>{{ u.role === 'admin' ? 'Admin' : 'Editor' }}</span></div>
        </div>
        <button type="button" class="signout" (click)="signOut()">Sign out</button>
      }
      <span class="powered">Powered by [Product name]</span>
    </div>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  clients = inject(ClientStore);
  auth = inject(AuthService);
  private router = inject(Router);
  readonly features = FEATURES;
  menuOpen = signal(false);

  modules = computed(() => CLIENT_MODULES.filter((m) => moduleEnabled(m.key) && this.clients.current().modules.includes(m.key)));

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  isSection(path: string): boolean {
    return this.router.url.startsWith(path);
  }

  pick(id: string): void {
    this.clients.select(id);
    this.menuOpen.set(false);
    // Land on a module this client actually has.
    const current = this.router.url.split('?')[0];
    const allowed = this.modules().some((m) => current.startsWith(m.nav.path));
    if (!allowed && !current.startsWith('/portfolio')) this.router.navigateByUrl('/overview');
  }
}
