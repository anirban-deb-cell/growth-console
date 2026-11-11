import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

export const CAMPAIGN_ROUTES: Routes = [
  { path: '', title: 'All campaigns', loadComponent: () => import('./campaign-list.page').then((m) => m.CampaignListPage) },
  // Enquiries moved to its own section (/enquiries) — old links still work.
  { path: 'enquiries', redirectTo: ({ queryParams }) => inject(Router).createUrlTree(['/enquiries'], { queryParams }) },
  { path: 'new', title: 'New campaign', loadComponent: () => import('./campaign-new.page').then((m) => m.CampaignNewPage) },
  { path: ':id/performance', title: 'Campaign performance', loadComponent: () => import('./campaign-performance.page').then((m) => m.CampaignPerformancePage) },
  { path: ':id/edit', title: 'Edit campaign', loadComponent: () => import('./campaign-new.page').then((m) => m.CampaignNewPage) }
];
