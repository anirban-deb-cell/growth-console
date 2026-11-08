import { Routes } from '@angular/router';

export const CAMPAIGN_ROUTES: Routes = [
  { path: '', title: 'All campaigns', loadComponent: () => import('./campaign-list.page').then((m) => m.CampaignListPage) },
  { path: 'new', title: 'New campaign', loadComponent: () => import('./campaign-new.page').then((m) => m.CampaignNewPage) }
];
