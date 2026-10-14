import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService, ItemService } from '../../../core/services/master.service';
import { Category, Item } from '../../../core/models/master.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService } from '../../../core/services/export.service';
import { isLowStock } from '../../../core/services/stock-alert.service';

@Component({
  selector: 'app-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './item.component.html'
})
export class ItemComponent implements OnInit {
  private itemService = inject(ItemService);
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  items = signal<Item[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.group({
    itemCode: ['', Validators.required],
    itemName: ['', Validators.required],
    categoryId: [null as number | null, Validators.required],
    unitOfMeasure: ['Kg', Validators.required],
    isRawMaterial: [false],
    isFinishedGood: [false],
    openingStock: [0],
    purchasePrice: [0],
    salePrice: [0],
    reorderLevel: [0]
  });

  ngOnInit(): void {
    this.categoryService.getAll().subscribe((data) => this.categories.set(data));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.itemService.getAll().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  isLow(i: Item): boolean {
    return isLowStock(i.currentStock, i.reorderLevel);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ unitOfMeasure: 'Kg', isRawMaterial: false, isFinishedGood: false, openingStock: 0, purchasePrice: 0, salePrice: 0, reorderLevel: 0 });
    this.showForm.set(true);
  }

  openEdit(i: Item): void {
    this.editingId.set(i.id);
    this.form.reset({
      itemCode: i.itemCode,
      itemName: i.itemName,
      categoryId: i.categoryId,
      unitOfMeasure: i.unitOfMeasure,
      isRawMaterial: i.isRawMaterial,
      isFinishedGood: i.isFinishedGood,
      openingStock: i.openingStock,
      purchasePrice: i.purchasePrice,
      salePrice: i.salePrice,
      reorderLevel: i.reorderLevel
    });
    this.form.get('itemCode')?.disable();
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.get('itemCode')?.enable();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    const id = this.editingId();

    const req = id ? this.itemService.update(id, payload) : this.itemService.create(payload);
    req.subscribe({
      next: () => {
        this.toast.success(id ? 'Item updated.' : 'Item created.');
        this.cancel();
        this.load();
      }
    });
  }

  remove(i: Item): void {
    if (!confirm(`Delete item "${i.itemName}"?`)) return;
    this.itemService.delete(i.id).subscribe({
      next: () => { this.toast.success('Item deleted.'); this.load(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.items().map((i) => ({ Code: i.itemCode, Name: i.itemName, Category: i.categoryName, UOM: i.unitOfMeasure, 'Raw Material': i.isRawMaterial ? 'Yes':'No', 'Finished Good': i.isFinishedGood ? 'Yes':'No', 'Current Stock': i.currentStock, 'Purchase Price': i.purchasePrice, 'Sale Price': i.salePrice })),
      `Items-${this.exportService.todayStamp()}`, 'Items'
    );
  }
}
