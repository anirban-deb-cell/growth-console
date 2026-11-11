import { ModuleKey } from '../data/models';

/**
 * What this build of the console shows. Switching a module back on is a
 * one-line change here — its code, routes and screens are all kept.
 *
 * Current release: Blog, Campaigns and Enquiries, for medgrowth.co.in.
 */
export const FEATURES = {
  /** Client modules shown in the sidebar and reachable by URL. */
  modules: ['blog', 'campaigns', 'enquiries'] as ModuleKey[],
  /** The agency-wide "Client portfolio" screen. */
  portfolio: false,
  /** The "Viewing client" switcher (multi-client agencies). */
  clientSwitcher: false,
  /** Client used when the switcher is off. */
  defaultClientId: 'medgrowth'
};

export function moduleEnabled(key: ModuleKey): boolean {
  return FEATURES.modules.includes(key);
}
