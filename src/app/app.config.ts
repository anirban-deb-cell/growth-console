import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, Injectable, provideZoneChangeDetection } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideBlogRepository } from './features/blog/blog-repository';
import { provideCampaignRepository } from './features/campaigns/campaign-repository';
import { provideLeadRepository } from './features/campaigns/lead-repository';

/** "All posts · Growth Console" in the browser tab. */
@Injectable({ providedIn: 'root' })
class ConsoleTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · Growth Console` : 'Growth Console');
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideBlogRepository(),
    provideCampaignRepository(),
    provideLeadRepository(),
    { provide: TitleStrategy, useClass: ConsoleTitleStrategy }
  ]
};
