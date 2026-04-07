import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService, DocumentItem } from './documents.service';
import { CategoriesService } from '../categories/categories.service';
import { FeatherIcon } from '../shared/directives/feather-icon';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherIcon],
  templateUrl: './documents.html',
  styleUrls: ['./documents.scss'],
})
export class DocumentsComponent implements OnInit {
  docs: DocumentItem[] = [];
  categories: string[] = [];
  title = '';
  description = '';
  category = '';
  file: File | null = null;

  // inline edit state
  editingId: string | null = null;
  editTitle = '';
  editDescription = '';
  editCategory = '';
  editFile: File | null = null;

  constructor(public svc: DocumentsService, private cats: CategoriesService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.refresh();
  }

  loadCategories() {
    this.cats
      .list()
      .subscribe((list) => (this.categories = list.map((x) => x.name)));
  }

  refresh() {
    this.svc.list().subscribe((d) => (this.docs = d));
  }

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files && input.files[0] ? input.files[0] : null;
    if (this.file) this.title = this.file.name;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const f =
      e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
        ? e.dataTransfer.files[0]
        : null;
    if (f) {
      this.file = f;
      this.title = f.name;
    }
  }

  clearFile() {
    this.file = null;
  }

  onUpload() {
    if (!this.file || !this.title) return;
    this.svc
      .upload({
        title: this.title,
        description: this.description,
        category: this.category,
        file: this.file,
      })
      .subscribe(() => {
        this.title = '';
        this.description = '';
        this.category = '';
        this.file = null;
        this.refresh();
      });
  }

  startEdit(d: DocumentItem) {
    this.editingId = d._id;
    this.editTitle = d.title;
    this.editDescription = d.description || '';
    this.editCategory = d.category || '';
  }

  cancelEdit() {
    this.editingId = null;
    this.editTitle = '';
    this.editDescription = '';
    this.editCategory = '';
    this.editFile = null;
  }

  onEditFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.editFile = input.files && input.files[0] ? input.files[0] : null;
  }

  saveEdit(d: DocumentItem) {
    const body: Partial<
      Pick<DocumentItem, 'title' | 'description' | 'category'>
    > = {
      title: this.editTitle,
      description: this.editDescription,
      category: this.editCategory,
    };
    this.svc
      .update(d._id, body, this.editFile || undefined)
      .subscribe((updated) => {
        const idx = this.docs.findIndex((x) => x._id === d._id);
        if (idx >= 0) this.docs[idx] = updated;
        this.cancelEdit();
      });
  }

  onDownload(d: DocumentItem) {
    this.svc.download(d._id).subscribe((blob: Blob) => {
      const safeUrl = this.createSafeBlobUrl(blob);
      if (!safeUrl) return;

      const link = document.createElement('a');
      const safeName = this.sanitizeFilename(d.fileName || 'document');
      link.href = safeUrl;
      link.download = safeName;
      link.rel = 'noopener noreferrer';
      link.click();
      setTimeout(() => URL.revokeObjectURL(safeUrl), 10_000);
    });
  }

  private sanitizeFilename(name: string): string {
    return (
      name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_.-]+/, '') ||
      'document'
    );
  }

  private createSafeBlobUrl(blob: Blob): string | null {
    if (!this.isAllowedBlobType(blob.type)) return null;
    const objectUrl = URL.createObjectURL(blob);
    return objectUrl.startsWith('blob:') ? objectUrl : null;
  }

  private isAllowedBlobType(type: string): boolean {
    const normalized = (type || '').toLowerCase();
    if (!normalized) return true;
    return [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(normalized);
  }

  onDelete(d: DocumentItem) {
    if (!confirm('Delete this document?')) return;
    this.svc.remove(d._id).subscribe(() => this.refresh());
  }

  // Preview state and actions
  previewDoc: DocumentItem | null = null;
  previewUrl: string | null = null;
  previewLoading = false;

  onView(d: DocumentItem) {
    // Open modal immediately with loader, then load blob
    this.previewDoc = d;
    this.previewUrl = null;
    this.previewLoading = true;
    this.svc.download(d._id).subscribe({
      next: (blob: Blob) => {
        if (this.previewUrl) {
          try {
            URL.revokeObjectURL(this.previewUrl);
          } catch {}
        }
        this.previewUrl = this.createSafeBlobUrl(blob);
        this.previewLoading = false;
      },
      error: () => {
        this.previewLoading = false;
        this.previewUrl = null;
      },
    });
  }

  closePreview() {
    if (this.previewUrl) {
      try {
        URL.revokeObjectURL(this.previewUrl);
      } catch {}
    }
    this.previewUrl = null;
    this.previewDoc = null;
    this.previewLoading = false;
  }
}
