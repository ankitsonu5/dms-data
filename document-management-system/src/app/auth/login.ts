
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  model = { email: '', password: '' };
  loading = false; error = '';
  showPassword = false; currentYear = new Date().getFullYear();

  constructor(private auth: AuthService, private router: Router) {}

  toggleShowPassword() { this.showPassword = !this.showPassword; }

  login() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.model.email, this.model.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/admin');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Login failed';
      },
    });
  }
}


