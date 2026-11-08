import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Every console screen requires a signed-in user. */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() only works before the first await — grab everything up front.
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.ensureChecked();
  return user ? true : router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};
