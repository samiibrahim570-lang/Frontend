import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/master.service';
import { Category } from '../../../core/models/master.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category.component.html'
})
export class CategoryComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.group({
    categoryName: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (data) => { this.categories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset();
    this.showForm.set(true);
  }

  openEdit(c: Category): void {
    this.editingId.set(c.id);
    this.form.reset({ categoryName: c.categoryName, description: c.description });
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    const id = this.editingId();

    const req = id ? this.categoryService.update(id, payload) : this.categoryService.create(payload);
    req.subscribe({
      next: () => {
        this.toast.success(id ? 'Category updated.' : 'Category created.');
        this.cancel();
        this.load();
      }
    });
  }

  remove(c: Category): void {
    if (!confirm(`Delete category "${c.categoryName}"?`)) return;
    this.categoryService.delete(c.id).subscribe({
      next: () => { this.toast.success('Category deleted.'); this.load(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.categories().map((c) => ({ Name: c.categoryName, Description: c.description })),
      `Categories-${this.exportService.todayStamp()}`, 'Categories'
    );
  }
}
