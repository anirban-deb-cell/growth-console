import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { FEATURES } from './core/config/features';
import { ShellComponent } from './core/layout/shell.component';
import { CLIENT_MODULES } from './core/modules/module-registry';
import { requireModule } from './core/modules/module.guard';

/** Landing screen: the portfolio when enabled, otherwise the first enabled module. */
// Home is the first module listed in FEATURES.modules.
const HOME = FEATURES.portfolio ? '/portfolio' : (CLIENT_MODULES.find((m) => m.key === FEATURES.modules[0])?.nav.path ?? '/blog');

const portfolioEnabled: CanActivateFn = () => FEATURES.portfolio || inject(Router).parseUrl(HOME);

/**
 * One lazy chunk per module, so a module a client doesn't use is never
 * downloaded and modules can be built and shipped independently.
 * Which ones are reachable is decided in core/config/features.ts.
 */
export const routes: Routes = [
  { path: 'login', title: 'Sign in', loadComponent: () => import('./core/auth/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: HOME },
      { path: 'portfolio', title: 'Client portfolio', canActivate: [portfolioEnabled], loadComponent: () => import('./features/portfolio/portfolio.page').then((m) => m.PortfolioPage) },
      { path: 'overview', title: 'Overview', canActivate: [requireModule('overview')], loadComponent: () => import('./features/overview/overview.page').then((m) => m.OverviewPage) },
      { path: 'campaigns', canActivate: [requireModule('campaigns')], loadChildren: () => import('./features/campaigns/campaigns.routes').then((m) => m.CAMPAIGN_ROUTES) },
      { path: 'enquiries', title: 'Enquiries', canActivate: [requireModule('enquiries')], loadComponent: () => import('./features/campaigns/enquiries.page').then((m) => m.EnquiriesPage) },
      { path: 'seo', title: 'SEO', canActivate: [requireModule('seo')], loadComponent: () => import('./features/seo/seo.page').then((m) => m.SeoPage) },
      { path: 'blog', canActivate: [requireModule('blog')], loadChildren: () => import('./features/blog/blog.routes').then((m) => m.BLOG_ROUTES) },
      { path: 'reputation', title: 'Reputation', canActivate: [requireModule('reputation')], loadComponent: () => import('./features/reputation/reputation.page').then((m) => m.ReputationPage) },
      { path: 'global-patients', title: 'Global patients', canActivate: [requireModule('global')], loadComponent: () => import('./features/global-patients/global-patients.page').then((m) => m.GlobalPatientsPage) }
    ]
  },
  { path: '**', redirectTo: '' }
];
