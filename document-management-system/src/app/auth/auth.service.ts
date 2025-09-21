import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ token: string; user: { email: string; role: string } }> {
    return this.http
      .post<{ token: string; user: { email: string; role: string } }>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((res) => localStorage.setItem('token', res.token)));
  }

  me(): Observable<{ user: { email: string; role: string } }> {
    return this.http.get<{ user: { email: string; role: string } }>(`${this.api}/auth/me`);
  }

  logout() {
    localStorage.removeItem('token');
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  forgot(email: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.api}/auth/forgot`, { email });
  }

  reset(token: string, password: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.api}/auth/reset`, { token, password });
  }
}

