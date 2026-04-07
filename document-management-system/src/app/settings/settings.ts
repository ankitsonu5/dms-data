import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsComponent {
  email = '';
  password = '';
  confirmPassword = '';
  pending = false;
  message = '';
  ok = false;

  constructor(private http: HttpClient) {}

  resetPassword() {
    if (!this.email || !this.password || !this.confirmPassword) return;
    if (this.password !== this.confirmPassword) {
      this.ok = false;
      this.message = 'Passwords do not match';
      return;
    }
    this.pending = true;
    this.message = '';
    this.ok = false;
    this.http
      .post('/users/reset-password', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.ok = true;
          this.message = 'Password reset successfully.';
          this.pending = false;
          this.email = '';
          this.password = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          this.ok = false;
          this.message = err?.error?.error || 'Failed to reset password';
          this.pending = false;
        },
      });
  }
}
