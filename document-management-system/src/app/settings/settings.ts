import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsComponent {
  email = '';
  pending = false;
  message = '';
  ok = false;

  constructor(private auth: AuthService) {}

  send() {
    if (!this.email) return;
    this.pending = true;
    this.message = '';
    this.ok = false;
    this.auth.forgot(this.email).subscribe({
      next: () => {
        this.ok = true;
        this.message = 'If the email exists, a reset link has been sent.';
        this.pending = false;
      },
      error: (err) => {
        this.ok = false;
        this.message = err?.error?.error || 'Failed to send reset link';
        this.pending = false;
      },
    });
  }
}

