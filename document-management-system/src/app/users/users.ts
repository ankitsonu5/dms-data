import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, AdminUser } from './users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  email = '';
  password = '';

  editingId: string | null = null;
  editEmail = '';
  editPassword = '';

  constructor(public svc: UsersService) {}

  ngOnInit(): void { this.refresh(); }

  refresh() {
    this.svc.list().subscribe(d => this.users = d);
  }

  onCreate() {
    if (!this.email || !this.password) return;
    this.svc.create({ email: this.email, password: this.password }).subscribe(() => {
      this.email = '';
      this.password = '';
      this.refresh();
    });
  }

  start(u: AdminUser) {
    this.editingId = u._id;
    this.editEmail = u.email;
    this.editPassword = '';
  }

  cancel() {
    this.editingId = null;
    this.editEmail = '';
    this.editPassword = '';
  }

  onSave(u: AdminUser) {
    const payload: { email?: string; password?: string } = {};
    if (this.editEmail && this.editEmail !== u.email) payload.email = this.editEmail;
    if (this.editPassword) payload.password = this.editPassword;
    if (Object.keys(payload).length === 0) { this.cancel(); return; }
    this.svc.update(u._id, payload).subscribe(() => { this.cancel(); this.refresh(); });
  }

  onDelete(u: AdminUser) {
    if (!confirm('Delete this user?')) return;
    this.svc.remove(u._id).subscribe(() => this.refresh());
  }
}

