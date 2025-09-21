import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUser {
  _id: string;
  email: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private api = 'http://localhost:3000';
  constructor(private http: HttpClient) {}

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`);
    }

  create(payload: { email: string; password: string; role?: string }): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.api}/users`, payload);
  }

  update(id: string, payload: { email?: string; password?: string; role?: string }): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.api}/users/${id}`, payload);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.api}/users/${id}`);
  }
}

