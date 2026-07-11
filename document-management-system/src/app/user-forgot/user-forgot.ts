import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-user-forgot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-forgot.html',
})
export class UserForgotComponent {
  email = '';
  error = '';
  success = false;
  loading = false;

  constructor(private http: HttpClient) {}

  submit() {
    this.error = '';
    if (!this.email.trim()) {
      this.error = 'Please enter your email address';
      return;
    }
    this.loading = true;
    this.http.post('/user/forgot', { email: this.email.trim() }).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Something went wrong';
        this.loading = false;
      },
    });
  }
}
