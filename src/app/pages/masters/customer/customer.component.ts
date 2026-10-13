import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../core/services/master.service';
import { Customer } from '../../../core/models/master.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer.component.html'
})
export class CustomerComponent implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  customers = signal<Customer[]>([]);
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
    cnic: [''],
    openingBalance: [0]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.customerService.getAll().subscribe({
      next: (data) => { this.customers.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ openingBalance: 0 });
    this.form.get('code')?.enable();
    this.showForm.set(true);
  }

  openEdit(c: Customer): void {
    this.editingId.set(c.id);
    this.form.reset(c);
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
    const req = id ? this.customerService.update(id, payload) : this.customerService.create(payload);
    req.subscribe({
      next: () => { this.toast.success(id ? 'Customer updated.' : 'Customer created.'); this.cancel(); this.load(); }
    });
  }

  remove(c: Customer): void {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    this.customerService.delete(c.id).subscribe({
      next: () => { this.toast.success('Customer deleted.'); this.load(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.customers().map((c) => ({ Code: c.code, Name: c.name, Phone: c.phone, City: c.city, 'Opening Balance': c.openingBalance, 'Current Balance': c.currentBalance })),
      `Customers-${this.exportService.todayStamp()}`, 'Customers'
    );
  }
}
