import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryItem } from './categories.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrls: ['./categories.scss'],
})
export class CategoriesComponent implements OnInit {
  items: CategoryItem[] = [];
  name = '';
  editingId: string | null = null;
  editName = '';

  constructor(private svc: CategoriesService) {}
  ngOnInit(): void { this.refresh(); }

  refresh() { this.svc.list().subscribe(d => this.items = d); }

  add() {
    if (!this.name.trim()) return;
    this.svc.create(this.name.trim()).subscribe(() => { this.name = ''; this.refresh(); });
  }

  startEdit(it: CategoryItem) { this.editingId = it._id; this.editName = it.name; }
  cancelEdit() { this.editingId = null; this.editName = ''; }

  save(it: CategoryItem) {
    if (!this.editName.trim()) return;
    this.svc.update(it._id, this.editName.trim()).subscribe(() => { this.cancelEdit(); this.refresh(); });
  }

  remove(it: CategoryItem) {
    if (!confirm('Delete this category?')) return;
    this.svc.remove(it._id).subscribe(() => this.refresh());
  }
}

