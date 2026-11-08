import { Routes } from '@angular/router';

export const BLOG_ROUTES: Routes = [
  { path: '', title: 'All posts', loadComponent: () => import('./blog-list.page').then((m) => m.BlogListPage) },
  { path: 'new', title: 'New post', loadComponent: () => import('./blog-editor.page').then((m) => m.BlogEditorPage) },
  { path: ':id/edit', title: 'Edit post', loadComponent: () => import('./blog-editor.page').then((m) => m.BlogEditorPage) }
];
