import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../user/user.service';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-login.html',
})
export class UserLoginComponent {
  form = { email: '', password: '' };
  error = '';
  loading = false;

  constructor(private userSvc: UserService, private router: Router) {}

  submit() {
    this.error = '';
    if (!this.form.email || !this.form.password) {
      this.error = 'Email and password are required';
      return;
    }
    this.loading = true;
    this.userSvc.login(this.form).subscribe({
      next: () => this.router.navigate(['/user-dashboard']),
      error: (err) => {
        this.error = err?.error?.error || 'Invalid credentials';
        this.loading = false;
      },
    });
  }
}
