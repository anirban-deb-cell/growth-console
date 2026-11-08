import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { moduleEnabled } from '../config/features';
import { ModuleKey } from '../data/models';
import { ClientStore } from '../data/stores';
import { CLIENT_MODULES } from './module-registry';

/**
 * Blocks a module's routes when it's switched off for this build
 * (features.ts) or for the current client (Client.modules).
 */
export function requireModule(key: ModuleKey): CanActivateFn {
  return () => {
    const clients = inject(ClientStore);
    if (moduleEnabled(key) && clients.hasModule(key)) return true;
    const fallback = CLIENT_MODULES.find((m) => moduleEnabled(m.key) && clients.hasModule(m.key));
    return inject(Router).parseUrl(fallback && fallback.key !== key ? fallback.nav.path : '/login');
  };
}
