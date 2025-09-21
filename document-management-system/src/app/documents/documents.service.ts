import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocumentItem {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  fileName: string;
  mimeType: string;
  size: number;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private api = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  list(): Observable<DocumentItem[]> {
    return this.http.get<DocumentItem[]>(`${this.api}/documents`);
  }

  search(params: { category?: string; from?: string; to?: string }): Observable<DocumentItem[]> {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const qs = query.toString();
    return this.http.get<DocumentItem[]>(`${this.api}/documents${qs ? '?' + qs : ''}`);
  }

  upload(payload: { title: string; description?: string; category?: string; file: File }): Observable<DocumentItem> {
    const form = new FormData();
    form.append('title', payload.title);
    if (payload.description) form.append('description', payload.description);
    if (payload.category) form.append('category', payload.category);
    form.append('file', payload.file);
    return this.http.post<DocumentItem>(`${this.api}/documents`, form);
  }

  update(id: string, body: Partial<Pick<DocumentItem, 'title' | 'description' | 'category'>>, file?: File): Observable<DocumentItem> {
    if (file) {
      const form = new FormData();
      if (body.title) form.append('title', body.title);
      if (typeof body.description !== 'undefined') form.append('description', body.description ?? '');
      if (typeof body.category !== 'undefined') form.append('category', body.category ?? '');
      form.append('file', file);
      return this.http.put<DocumentItem>(`${this.api}/documents/${id}`, form);
    }
    return this.http.put<DocumentItem>(`${this.api}/documents/${id}`, body);
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.api}/documents/${id}/file`, { responseType: 'blob' }) as unknown as Observable<Blob>;
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.api}/documents/${id}`);
  }

  fileUrl(doc: DocumentItem): string {
    return `${this.api}/documents/${doc._id}/file`;
  }
}

