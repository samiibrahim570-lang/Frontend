import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplierService } from '../../../core/services/master.service';
import { Supplier } from '../../../core/models/master.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './supplier.component.html'
})
export class SupplierComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  suppliers = signal<Supplier[]>([]);
  private route = inject(ActivatedRoute);
  /** Quick filter; pre-filled from ?q= when opened from the header search. */
  filter = signal('');
  visible = computed(() => {
    const q = this.filter().trim().toLowerCase();
    return q ? this.suppliers().filter((x: any) => (x.code ?? '').toString().toLowerCase().includes(q) || (x.name ?? '').toString().toLowerCase().includes(q) || (x.phone ?? '').toString().toLowerCase().includes(q) || (x.city ?? '').toString().toLowerCase().includes(q)) : this.suppliers();
  });
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    contactPerson: [''],
    phone: [''],
    address: [''],
    city: [''],
    openingBalance: [0]
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => this.filter.set(p.get('q') ?? '')); this.load(); }

  load(): void {
    this.loading.set(true);
    this.supplierService.getAll().subscribe({
      next: (data) => { this.suppliers.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ openingBalance: 0 });
    this.form.get('code')?.enable();
    this.showForm.set(true);
  }

  openEdit(s: Supplier): void {
    this.editingId.set(s.id);
    this.form.reset(s);
    this.form.get('code')?.disable();
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.get('code')?.enable();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const req = id ? this.supplierService.update(id, payload) : this.supplierService.create(payload);
    req.subscribe({
      next: () => { this.toast.success(id ? 'Supplier updated.' : 'Supplier created.'); this.cancel(); this.load(); }
    });
  }

  remove(s: Supplier): void {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    this.supplierService.delete(s.id).subscribe({
      next: () => { this.toast.success('Supplier deleted.'); this.load(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.suppliers().map((s) => ({ Code: s.code, Name: s.name, Phone: s.phone, City: s.city, 'Opening Balance': s.openingBalance, 'Current Balance': s.currentBalance })),
      `Suppliers-${this.exportService.todayStamp()}`, 'Suppliers'
    );
  }
}
