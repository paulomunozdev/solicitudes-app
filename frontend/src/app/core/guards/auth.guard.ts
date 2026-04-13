import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requiere usuario autenticado. Redirige a /login si no hay sesión. */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Requiere rol Gestor (≥2) o Admin (3). Redirige a /solicitudes si el rol es insuficiente. */
export const gestorGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.isGestor()) return true;
  return router.createUrlTree(['/solicitudes']);
};

/** Requiere rol Admin (3). Redirige a /solicitudes si el rol es insuficiente. */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/solicitudes']);
};
