import { Route } from '@angular/router';
import { LoginComponent } from './auth/login';
import { AdminComponent } from './admin/admin';
import { authGuard } from './auth/auth.guard';
import { DocumentsComponent } from './documents/documents';
import { UsersComponent } from './users/users';
import { SettingsComponent } from './settings/settings';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'documents', component: DocumentsComponent, canActivate: [authGuard] },
  { path: 'users', component: UsersComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
];
