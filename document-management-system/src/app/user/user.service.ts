import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UserInfo {
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = '';

  constructor(private http: HttpClient) {}

  register(payload: {
    name: string;
    email: string;
    password: string;
  }): Observable<{ token: string; user: UserInfo }> {
    return this.http
      .post<{ token: string; user: UserInfo }>(
        `${this.api}/user/register`,
        payload
      )
      .pipe(
        tap((res) => {
          localStorage.setItem('user_token', res.token);
          localStorage.setItem('user_info', JSON.stringify(res.user));
        })
      );
  }

  login(payload: {
    email: string;
    password: string;
  }): Observable<{ token: string; user: UserInfo }> {
    return this.http
      .post<{ token: string; user: UserInfo }>(
        `${this.api}/user/login`,
        payload
      )
      .pipe(
        tap((res) => {
          localStorage.setItem('user_token', res.token);
          localStorage.setItem('user_info', JSON.stringify(res.user));
        })
      );
  }

  logout() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
  }

  get token(): string | null {
    return localStorage.getItem('user_token');
  }

  get userInfo(): UserInfo | null {
    const s = localStorage.getItem('user_info');
    return s ? JSON.parse(s) : null;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }
}
