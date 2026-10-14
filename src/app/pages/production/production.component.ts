import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { ItemService } from '../../core/services/master.service';
import { Item } from '../../core/models/master.model';
import { ProductionResponse } from '../../core/models/transactions.model';
import { defaultPagedRequest, PagedRequest } from '../../core/models/common.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';
import { StockAlertService } from '../../core/services/stock-alert.service';

@Component({
  selector: 'app-production',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './production.component.html'
})
export class ProductionComponent implements OnInit {
  private productionService = inject(ProductionService);
  private itemService = inject(ItemService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  auth = inject(AuthService);
  stock = inject(StockAlertService);

  productions = signal<ProductionResponse[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  viewing = signal<ProductionResponse | null>(null);

  rawMaterialItems = signal<Item[]>([]);
  finishedGoodItems = signal<Item[]>([]);
  allItems = signal<Item[]>([]);

  request: PagedRequest = { ...defaultPagedRequest };

  form = this.fb.group({
    productionDate: [this.today(), Validators.required],
    wastageQty: [0],
    remarks: [''],
    rawMaterials: this.fb.array([]),
    outputs: this.fb.array([])
  });

  get rawRows(): FormArray { return this.form.get('rawMaterials') as FormArray; }
  get outputRows(): FormArray { return this.form.get('outputs') as FormArray; }

  today(): string { return new Date().toISOString().substring(0, 10); }

  ngOnInit(): void {
    // Load all three views so we can show a helpful message when a flag-based list is empty
    // (e.g. no item has been marked "Finished Good" yet in the Items master).
    this.itemService.getAll(true, false).subscribe((d) => this.rawMaterialItems.set(d));
    this.itemService.getAll(false, true).subscribe((d) => this.finishedGoodItems.set(d));
    this.itemService.getAll().subscribe((d) => this.allItems.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productionService.getAll(this.request).subscribe({
      next: (res) => { this.productions.set(res.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  newLineRow() {
    return this.fb.group({
      itemId: [null as number | null, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.001)]],
      rate: [0]
    });
  }

  addRawRow(): void { this.rawRows.push(this.newLineRow()); }
  removeRawRow(i: number): void { this.rawRows.removeAt(i); }
  addOutputRow(): void { this.outputRows.push(this.newLineRow()); }
  removeOutputRow(i: number): void { this.outputRows.removeAt(i); }

  totalRawQty(): number {
    return this.rawRows.controls.reduce((sum, c) => sum + (c.getRawValue().quantity || 0), 0);
  }
  totalOutputQty(): number {
    return this.outputRows.controls.reduce((sum, c) => sum + (c.getRawValue().quantity || 0), 0);
  }

  openCreate(): void {
    this.form.reset({ productionDate: this.today(), wastageQty: 0, remarks: '' });
    this.rawRows.clear();
    this.outputRows.clear();
    this.addRawRow();
    this.addOutputRow();
    this.showForm.set(true);
    this.viewing.set(null);
  }

  cancelForm(): void { this.showForm.set(false); }

  save(): void {
    // Give a precise reason instead of a generic message, since an empty/invalid item
    // dropdown selection is the most common cause of "why won't this save".
    const rawInvalid = this.rawRows.controls.some((c) => !c.get('itemId')?.value || (c.get('quantity')?.value || 0) <= 0);
    const outputInvalid = this.outputRows.controls.some((c) => !c.get('itemId')?.value || (c.get('quantity')?.value || 0) <= 0);

    if (this.rawRows.length === 0 || rawInvalid) {
      this.toast.error('Select a Raw Material item and a quantity greater than 0 for every raw material row.');
      this.form.markAllAsTouched();
      return;
    }
    if (this.outputRows.length === 0 || outputInvalid) {
      if (this.finishedGoodItems().length === 0) {
        this.toast.error('No item is marked as "Finished Good" yet. Go to Items and enable the Finished Good flag on your output item first.');
      } else {
        this.toast.error('Select an Output item and a quantity greater than 0 for every output row.');
      }
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.productionService
      .create({
        productionDate: v.productionDate!,
        wastageQty: v.wastageQty || 0,
        remarks: v.remarks,
        rawMaterials: v.rawMaterials as any,
        outputs: v.outputs as any
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success(`Production ${res.productionNo} recorded.`);
          this.showForm.set(false);
          this.load();
        },
        error: () => this.saving.set(false)
      });
  }

  view(p: ProductionResponse): void { this.viewing.set(p); this.showForm.set(false); }
  closeView(): void { this.viewing.set(null); }

  printProduction(p: ProductionResponse): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/print/production', p.id]));
    window.open(url, '_blank');
  }

  cancelProduction(p: ProductionResponse): void {
    if (!confirm(`Cancel Production ${p.productionNo}? Stock will be reversed.`)) return;
    this.productionService.cancel(p.id).subscribe({
      next: () => { this.toast.success('Production cancelled.'); this.load(); this.closeView(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.productions().map((p) => ({
        'Production No': p.productionNo, Date: p.productionDate,
        'Raw Material Qty': p.totalRawMaterialQty, 'Output Qty': p.totalOutputQty,
        Wastage: p.wastageQty, Status: p.status
      })),
      `Production-List-${this.exportService.todayStamp()}`, 'Production'
    );
  }
}
