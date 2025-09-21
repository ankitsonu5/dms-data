import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService, DocumentItem } from '../documents/documents.service';
import { CategoriesService } from '../categories/categories.service';
import { forkJoin } from 'rxjs';
import { FeatherIcon } from '../shared/directives/feather-icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-documents-view',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherIcon],
  templateUrl: './documents-view.html',
  styleUrls: ['./documents-view.scss'],
})
export class DocumentsViewComponent implements OnInit {
  docs: DocumentItem[] = [];
  categories: string[] = [];
  category = '';
  from = '';
  to = '';
  loading = false;

  // Paging & sorting
  page = 1;
  limit = 20;
  total = 0;
  sortBy: 'createdAt' | 'title' | 'category' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  // Selection & bulk actions
  selected = new Set<string>();
  moveCategory = '';

  constructor(private svc: DocumentsService, private cats: CategoriesService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void { this.loadCategories(); this.search(); }

  loadCategories() {
    this.cats.list().subscribe(list => this.categories = list.map(x => x.name));
  }

  search() {
    this.loading = true;
    this.svc.searchPaged({
      category: this.category || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    }).subscribe({
      next: (d) => { this.docs = d.items; this.total = d.total; this.loading = false; this.selected.clear(); },
      error: () => { this.loading = false; },
    });
  }

  clear() {
    this.category = '';
    this.from = '';
    this.to = '';
    this.page = 1;
    this.search();
  }

  // Paging helpers
  get totalPages() { return Math.max(1, Math.ceil(this.total / this.limit)); }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.search(); } }
  prevPage() { if (this.page > 1) { this.page--; this.search(); } }
  goToPage(p: number) { const n = Math.min(Math.max(1, p), this.totalPages); if (n !== this.page) { this.page = n; this.search(); } }
  changeLimit(n: number) { this.limit = n; this.page = 1; this.search(); }

  // Sorting
  sort(col: 'createdAt'|'title'|'category') {
    if (this.sortBy === col) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortBy = col; this.sortDir = col === 'createdAt' ? 'desc' : 'asc'; }
    this.page = 1;
    this.search();
  }

  // Selection helpers
  get anySelected() { return this.selected.size > 0; }
  get allOnPageSelected() { return this.docs.length > 0 && this.docs.every(d => this.selected.has(d._id)); }
  toggleSelectAllOnPage(checked: boolean) {
    if (checked) this.docs.forEach(d => this.selected.add(d._id));
    else this.docs.forEach(d => this.selected.delete(d._id));
  }
  toggleRow(d: DocumentItem, checked: boolean) {
    if (checked) this.selected.add(d._id);
    else this.selected.delete(d._id);
  }

  // Bulk actions
  bulkDelete() {
    if (!this.anySelected) return;
    if (!confirm(`Delete ${this.selected.size} document(s)? This cannot be undone.`)) return;
    this.loading = true;
    const calls = Array.from(this.selected).map(id => this.svc.remove(id));
    forkJoin(calls).subscribe({
      next: () => { this.selected.clear(); this.search(); },
      error: () => { this.loading = false; }
    });
  }

  bulkMove() {
    if (!this.anySelected || !this.moveCategory) return;
    this.loading = true;
    const calls = Array.from(this.selected).map(id => this.svc.update(id, { category: this.moveCategory }));
    forkJoin(calls).subscribe({
      next: () => { this.selected.clear(); this.moveCategory = ''; this.search(); },
      error: () => { this.loading = false; }
    });
  }

  // Preview modal
  previewDoc: DocumentItem | null = null;
  previewUrl: string | null = null;
  trustedPreviewUrl: SafeResourceUrl | null = null;
  previewLoading = false;

  onView(d: DocumentItem) {
    // Open modal immediately and load in background
    this.previewDoc = d;
    this.previewUrl = null;
    this.previewLoading = true;
    this.svc.download(d._id).subscribe({
      next: (blob: Blob) => {
        if (this.previewUrl) { try { URL.revokeObjectURL(this.previewUrl); } catch {} }
        this.previewUrl = URL.createObjectURL(blob);
        this.trustedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
        this.previewUrl = null;
        this.trustedPreviewUrl = null;
      }
    });
  }

  closePreview() {
    if (this.previewUrl) { try { URL.revokeObjectURL(this.previewUrl); } catch {} }
    this.previewUrl = null;
    this.trustedPreviewUrl = null;
    this.previewDoc = null;
    this.previewLoading = false;
  }

  onDownload(d: DocumentItem) {
    this.svc.download(d._id).subscribe((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }
}

