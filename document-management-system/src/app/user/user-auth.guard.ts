import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from './user.service';

export const userAuthGuard = () => {
  const router = inject(Router);
  const user = inject(UserService);
  if (user.isLoggedIn) return true;
  return router.createUrlTree(['/user-login']);
};
