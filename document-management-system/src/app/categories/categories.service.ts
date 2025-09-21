import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoryItem {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private api = 'http://localhost:3000';
  constructor(private http: HttpClient) {}

  list(): Observable<CategoryItem[]> {
    return this.http.get<CategoryItem[]>(`${this.api}/categories`);
  }

  create(name: string): Observable<CategoryItem> {
    return this.http.post<CategoryItem>(`${this.api}/categories`, { name });
  }

  update(id: string, name: string): Observable<CategoryItem> {
    return this.http.put<CategoryItem>(`${this.api}/categories/${id}`, { name });
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.api}/categories/${id}`);
  }
}

