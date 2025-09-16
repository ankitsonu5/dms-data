import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = auth.token;
  if (token) return true;
  return router.createUrlTree(['/login']);
};

