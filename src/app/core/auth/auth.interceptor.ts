import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * For calls to our own API: adds the X-Requested-With header the PHP side
 * requires on every change (its CSRF guard), and sends the user to the
 * sign-in screen when the session has expired. A request the server never
 * answers fails after a while (TimeoutError) instead of spinning forever.
 */
const API_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const request = req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });

  return next(request).pipe(
    timeout(req.body instanceof FormData ? UPLOAD_TIMEOUT_MS : API_TIMEOUT_MS),
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthCall) {
        auth.sessionExpired();
        router.navigate(['/login'], { queryParams: { next: router.url, expired: 1 } });
      }
      return throwError(() => err);
    })
  );
};
