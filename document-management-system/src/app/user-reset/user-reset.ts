import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-user-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-reset.html',
})
export class UserResetComponent implements OnInit {
  token = '';
  password = '';
  confirm = '';
  error = '';
  success = false;
  loading = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.error = 'Invalid or missing reset token.';
  }

  submit() {
    this.error = '';
    if (!this.password || this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    if (this.password !== this.confirm) {
      this.error = 'Passwords do not match';
      return;
    }
    this.loading = true;
    this.http
      .post('/user/reset', { token: this.token, password: this.password })
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (err) => {
          this.error =
            err?.error?.error || 'Reset failed. Link may have expired.';
          this.loading = false;
        },
      });
  }
}
