import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import {
  AiService, ColumnMapping, ImportEntity, ImportField, ImportResult, apiErrorMessage
} from '../../core/services/ai.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type Step = 'upload' | 'map' | 'review' | 'done';

const MENU_KEY: Record<ImportEntity, string> = { customer: 'CUSTOMER', supplier: 'SUPPLIER', item: 'ITEM' };
const SAMPLE_ROWS = 5;

/**
 * Excel import wizard: upload -> AI suggests column mapping (headers + 5 sample rows only) ->
 * user corrects mapping -> server validates every row -> user imports (all-or-nothing).
 */
@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss'
})
export class ImportComponent {
  private ai = inject(AiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  readonly entities: { key: ImportEntity; label: string }[] = (
    [
      { key: 'customer', label: 'Customers' },
      { key: 'supplier', label: 'Suppliers' },
      { key: 'item', label: 'Items / Products' }
    ] as { key: ImportEntity; label: string }[]
  ).filter((e) => this.auth.canCreate(MENU_KEY[e.key]));

  step = signal<Step>('upload');
  entity = signal<ImportEntity>(this.entities[0]?.key ?? 'customer');
  fileName = signal('');
  sheetNames = signal<string[]>([]);
  sheetName = signal('');
  headers = signal<string[]>([]);
  dataRows = signal<(string | null)[][]>([]);

  fields = signal<ImportField[]>([]);
  mappings = signal<ColumnMapping[]>([]);
  aiNotes = signal<string | null>(null);
  aiFailed = signal<string | null>(null);
  createMissingCategories = false;

  busy = signal(false);
  result = signal<ImportResult | null>(null);

  private workbook: XLSX.WorkBook | null = null;

  /** Mapped rows as { Field: value }, empty rows dropped. */
  mappedRows = computed(() => {
    const cols = this.mappings()
      .map((m, idx) => ({ idx, field: m.targetField }))
      .filter((c): c is { idx: number; field: string } => !!c.field);
    return this.dataRows()
      .map((r) => {
        const o: Record<string, string | null> = {};
        for (const c of cols) o[c.field] = r[c.idx] ?? null;
        return o;
      })
      .filter((o) => Object.values(o).some((v) => v !== null && String(v).trim() !== ''));
  });

  missingRequired = computed(() => {
    const used = new Set(this.mappings().map((m) => m.targetField).filter(Boolean));
    return this.fields().filter((f) => f.required && !used.has(f.field));
  });

  missingRequiredLabels = computed(() => this.missingRequired().map((f) => f.label).join(', '));

  mappedFields = computed(() => {
    const used = new Set(this.mappings().map((m) => m.targetField).filter(Boolean));
    return this.fields().filter((f) => used.has(f.field));
  });

  errorsByRow = computed(() => {
    const map = new Map<number, string[]>();
    for (const e of this.result()?.errors ?? []) map.set(e.row, [...(map.get(e.row) ?? []), e.message]);
    return map;
  });

  // ---------- step 1: upload ----------

  async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('File is too large (max 10 MB).');
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      this.workbook = XLSX.read(buf, { type: 'array', cellDates: true });
      this.fileName.set(file.name);
      this.sheetNames.set(this.workbook.SheetNames);
      this.selectSheet(this.workbook.SheetNames[0]);
    } catch {
      this.toast.error('Could not read this file. Please upload an .xlsx, .xls or .csv file.');
    }
  }

  selectSheet(name: string): void {
    if (!this.workbook) return;
    this.sheetName.set(name);
    const sheet = this.workbook.Sheets[name];
    const grid = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
      header: 1, raw: false, defval: null, blankrows: false
    });
    const text = grid.map((r) => r.map((c) => (c === null || c === undefined ? null : String(c).trim() || null)));
    const headerIdx = text.findIndex((r) => r.filter((c) => c).length >= 2);
    if (headerIdx < 0) {
      this.headers.set([]);
      this.dataRows.set([]);
      return;
    }
    const width = Math.max(...text.slice(headerIdx).map((r) => r.length));
    const headers = Array.from({ length: width }, (_, i) => text[headerIdx][i] ?? `Column ${i + 1}`);
    this.headers.set(headers);
    this.dataRows.set(text.slice(headerIdx + 1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null)));
  }

  // ---------- step 2: mapping ----------

  suggestMapping(): void {
    if (this.headers().length === 0 || this.dataRows().length === 0) {
      this.toast.error('No data rows found in this sheet.');
      return;
    }
    this.busy.set(true);
    this.aiFailed.set(null);
    this.aiNotes.set(null);
    this.result.set(null);

    this.ai.mapColumns(this.entity(), this.headers(), this.dataRows().slice(0, SAMPLE_ROWS)).subscribe({
      next: (res) => {
        this.fields.set(res.fields);
        this.mappings.set(res.mappings);
        this.aiNotes.set(res.notes || null);
        this.busy.set(false);
        this.step.set('map');
      },
      error: (err) => {
        // AI not available: fall back to manual mapping
        this.aiFailed.set(apiErrorMessage(err, 'AI mapping is not available.'));
        this.ai.importFields(this.entity()).subscribe({
          next: (fields) => {
            this.fields.set(fields);
            this.mappings.set(this.headers().map((h) => ({ sourceColumn: h, targetField: null, confidence: 'low' })));
            this.busy.set(false);
            this.step.set('map');
          },
          error: () => this.busy.set(false)
        });
      }
    });
  }

  setMapping(index: number, field: string): void {
    const target = field || null;
    this.mappings.update((list) =>
      list.map((m, i) => {
        if (i === index) return { ...m, targetField: target, confidence: 'high' };
        // a field can be used by one column only
        if (target && m.targetField === target) return { ...m, targetField: null };
        return m;
      })
    );
    this.result.set(null);
  }

  sample(colIndex: number): string {
    return this.dataRows().slice(0, 3).map((r) => r[colIndex]).filter((v) => v).join(' · ');
  }

  // ---------- step 3: validate / import ----------

  validate(): void {
    this.run(false);
  }

  importNow(): void {
    this.run(true);
  }

  private run(commit: boolean): void {
    const rows = this.mappedRows();
    if (rows.length === 0) {
      this.toast.error('No rows to import.');
      return;
    }
    this.busy.set(true);
    this.ai.importRows(this.entity(), rows, commit, this.createMissingCategories).subscribe({
      next: (res) => {
        this.result.set(res.data);
        this.busy.set(false);
        if (res.data.committed) {
          this.toast.success(res.message);
          this.step.set('done');
        } else {
          this.step.set('review');
        }
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(apiErrorMessage(err, 'Import failed.'));
      }
    });
  }

  reset(): void {
    this.step.set('upload');
    this.workbook = null;
    this.fileName.set('');
    this.sheetNames.set([]);
    this.headers.set([]);
    this.dataRows.set([]);
    this.mappings.set([]);
    this.result.set(null);
    this.aiNotes.set(null);
    this.aiFailed.set(null);
  }

  entityLabel(): string {
    return this.entities.find((e) => e.key === this.entity())?.label ?? '';
  }
}
