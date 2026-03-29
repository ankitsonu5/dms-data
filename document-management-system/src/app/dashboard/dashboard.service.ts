import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  documentsTotal: number;
  documentsToday: number;
  usersTotal: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = '';
  constructor(private http: HttpClient) {}
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.api}/stats`);
  }
}
