import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService, DocumentItem } from './documents.service';
import { CategoriesService } from '../categories/categories.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    this.cats.list().subscribe(list => this.categories = list.map(x => x.name));
  }

  refresh() {
    this.svc.list().subscribe((d) => (this.docs = d));
  }

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.file = input.files && input.files[0] ? input.files[0] : null;
  }

  onUpload() {
    if (!this.file || !this.title) return;
    this.svc.upload({ title: this.title, description: this.description, category: this.category, file: this.file }).subscribe(() => {
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
    const body: Partial<Pick<DocumentItem, 'title' | 'description' | 'category'>> = {
      title: this.editTitle,
      description: this.editDescription,
      category: this.editCategory,
    };
    this.svc.update(d._id, body, this.editFile || undefined).subscribe((updated) => {
      const idx = this.docs.findIndex((x) => x._id === d._id);
      if (idx >= 0) this.docs[idx] = updated;
      this.cancelEdit();
    });
  }

  onDownload(d: DocumentItem) {
    this.svc.download(d._id).subscribe((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }

  onDelete(d: DocumentItem) {
    if (!confirm('Delete this document?')) return;
    this.svc.remove(d._id).subscribe(() => this.refresh());
  }
}

