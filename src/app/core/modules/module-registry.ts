import { ModuleKey } from '../data/models';
import { IconName } from '../../shared/icon.component';

export interface NavLink {
  label: string;
  path: string;
  icon: IconName;
  /** Small count or label shown at the end of the row. */
  badge?: string;
  badgeTone?: 'red' | 'amber' | 'mint';
  children?: { label: string; path: string }[];
}

export interface ModuleDef {
  key: ModuleKey;
  nav: NavLink;
}

/**
 * Every client-level module the console offers. The sidebar shows only the
 * modules a client has switched on (Client.modules), which is how one
 * product serves a dental chain and a multispeciality hospital differently.
 * Adding a module = one entry here + its lazy routes in app.routes.ts.
 */
export const CLIENT_MODULES: ModuleDef[] = [
  { key: 'overview', nav: { label: 'Overview', path: '/overview', icon: 'grid' } },
  {
    key: 'campaigns',
    nav: {
      label: 'Campaigns', path: '/campaigns', icon: 'megaphone',
      children: [{ label: 'All campaigns', path: '/campaigns' }, { label: 'New campaign', path: '/campaigns/new' }]
    }
  },
  // Every lead from the website in one inbox: campaign landing pages and the Contact Us form.
  { key: 'enquiries', nav: { label: 'Enquiries', path: '/enquiries', icon: 'inbox' } },
  { key: 'seo', nav: { label: 'SEO', path: '/seo', icon: 'search' } },
  {
    key: 'blog',
    nav: {
      label: 'Blog', path: '/blog', icon: 'doc',
      children: [{ label: 'All posts', path: '/blog' }, { label: 'New post', path: '/blog/new' }]
    }
  },
  { key: 'reputation', nav: { label: 'Reputation', path: '/reputation', icon: 'star', badge: '7', badgeTone: 'amber' } },
  { key: 'global', nav: { label: 'Global patients', path: '/global-patients', icon: 'globe', badge: 'NEW', badgeTone: 'mint' } }
];
