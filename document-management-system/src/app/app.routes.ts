import { Route } from '@angular/router';
import { LoginComponent } from './auth/login';
import { AdminComponent } from './admin/admin';
import { authGuard } from './auth/auth.guard';
import { DocumentsComponent } from './documents/documents';
import { UsersComponent } from './users/users';
import { SettingsComponent } from './settings/settings';
import { DocumentsViewComponent } from './documents-view/documents-view';
import { CategoriesComponent } from './categories/categories';
import { DashboardComponent } from './dashboard/dashboard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AdminComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'documents', component: DocumentsViewComponent },
      { path: 'documents/upload', component: DocumentsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
