import { Route } from '@angular/router';
import { LoginComponent } from './auth/login';
import { AdminComponent } from './admin/admin';
import { authGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
];
