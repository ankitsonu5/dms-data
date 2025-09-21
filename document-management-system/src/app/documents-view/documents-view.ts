import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService, DocumentItem } from '../documents/documents.service';
import { CategoriesService } from '../categories/categories.service';

@Component({
  selector: 'app-documents-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private svc: DocumentsService, private cats: CategoriesService) {}

  ngOnInit(): void { this.loadCategories(); this.search(); }

  loadCategories() {
    this.cats.list().subscribe(list => this.categories = list.map(x => x.name));
  }

  search() {
    this.loading = true;
    this.svc.search({ category: this.category || undefined, from: this.from || undefined, to: this.to || undefined })
      .subscribe({ next: (d) => { this.docs = d; this.loading = false; }, error: () => { this.loading = false; } });
  }

  clear() {
    this.category = '';
    this.from = '';
    this.to = '';
    this.search();
  }

  onDownload(d: DocumentItem) {
    this.svc.download(d._id).subscribe((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }
}

