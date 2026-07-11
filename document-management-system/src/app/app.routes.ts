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
import { PaymentsComponent } from './payments/payments';
import { LandingComponent } from './landing/landing';
import { UserRegisterComponent } from './user-register/user-register';
import { UserLoginComponent } from './user-login/user-login';
import { UserDashboardComponent } from './user-dashboard/user-dashboard';
import { userAuthGuard } from './user/user-auth.guard';
import { UserForgotComponent } from './user-forgot/user-forgot';
import { UserResetComponent } from './user-reset/user-reset';

export const appRoutes: Route[] = [
  // Public user-facing routes
  { path: '', component: LandingComponent, pathMatch: 'full' },
  { path: 'register', component: UserRegisterComponent },
  { path: 'user-login', component: UserLoginComponent },
  { path: 'user-forgot', component: UserForgotComponent },
  { path: 'user-reset', component: UserResetComponent },
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [userAuthGuard],
  },

  // Admin login
  { path: 'login', component: LoginComponent },

  // Admin panel (AdminComponent is the layout shell)
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
      { path: 'payments', component: PaymentsComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
