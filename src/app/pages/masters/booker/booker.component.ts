import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookerService } from '../../../core/services/master.service';
import { Booker } from '../../../core/models/master.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-booker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booker.component.html'
})
export class BookerComponent implements OnInit {
  private bookerService = inject(BookerService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private exportService = inject(ExportService);
  auth = inject(AuthService);

  bookers = signal<Booker[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    phone: [''],
    address: [''],
    commissionPercent: [0]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.bookerService.getAll().subscribe({
      next: (data) => { this.bookers.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ commissionPercent: 0 });
    this.form.get('code')?.enable();
    this.showForm.set(true);
  }

  openEdit(b: Booker): void {
    this.editingId.set(b.id);
    this.form.reset(b);
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
    const req = id ? this.bookerService.update(id, payload) : this.bookerService.create(payload);
    req.subscribe({
      next: () => { this.toast.success(id ? 'Booker updated.' : 'Booker created.'); this.cancel(); this.load(); }
    });
  }

  remove(b: Booker): void {
    if (!confirm(`Delete booker "${b.name}"?`)) return;
    this.bookerService.delete(b.id).subscribe({
      next: () => { this.toast.success('Booker deleted.'); this.load(); }
    });
  }

  exportExcel(): void {
    this.exportService.exportToExcel(
      this.bookers().map((b) => ({ Code: b.code, Name: b.name, Phone: b.phone, 'Commission %': b.commissionPercent })),
      `Bookers-${this.exportService.todayStamp()}`, 'Bookers'
    );
  }
}
