import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../user/user.service';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-register.html',
})
export class UserRegisterComponent {
  form = { name: '', email: '', password: '' };
  error = '';
  loading = false;

  constructor(private userSvc: UserService, private router: Router) {}

  submit() {
    this.error = '';
    const { name, email, password } = this.form;
    if (!name.trim() || !email.trim() || !password) {
      this.error = 'All fields are required';
      return;
    }
    if (password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    this.loading = true;
    this.userSvc
      .register({ name: name.trim(), email: email.trim(), password })
      .subscribe({
        next: () => this.router.navigate(['/user-dashboard']),
        error: (err) => {
          this.error = err?.error?.error || 'Registration failed';
          this.loading = false;
        },
      });
  }
}
