import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from '../data/stores';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="shell">
      <app-sidebar class="side" />
      <main class="content"><router-outlet /></main>
    </div>
    @if (toast.message(); as msg) {
      <div class="toast" role="status"><b>✓</b> {{ msg }}</div>
    }
  `,
  styles: `
    .shell { display: flex; flex-wrap: wrap; align-items: stretch; min-height: 100vh; }
    .side { flex: 1 1 236px; max-width: 280px; min-width: 0; }
    .content { flex: 999 1 560px; min-width: 0; padding: 28px 32px 64px; }
    @media (max-width: 860px) {
      .side { flex-basis: 100%; max-width: 100%; }
      .content { padding: 20px 16px 48px; }
    }
  `
})
export class ShellComponent {
  toast = inject(ToastService);
}
