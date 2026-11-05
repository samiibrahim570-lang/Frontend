import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, switchMap, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportService } from '../../core/services/report.service';
import { DashboardAnalytics, DashboardItemSale, RankedAmount } from '../../core/models/transactions.model';
import { AuthService } from '../../core/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StockAlertsCardComponent } from '../../shared/components/stock-alerts-card/stock-alerts-card.component';
import { DateRangeFilterComponent } from '../../shared/components/date-range-filter/date-range-filter.component';
import { DATE_PRESETS, DateRange } from '../../core/utils/date.util';
import { LineChartComponent, LineSeries } from '../../shared/components/charts/line-chart.component';
import { UpDownChartComponent } from '../../shared/components/charts/up-down-chart.component';
import { DonutChartComponent } from '../../shared/components/charts/donut-chart.component';
import { RankBarsComponent, RankRow } from '../../shared/components/charts/rank-bars.component';
import { CountUpDirective } from '../../shared/components/charts/count-up.directive';
import { percentChange } from '../../shared/components/charts/chart-format';

type DashboardTab = 'overview' | 'items' | 'money' | 'ledger' | 'stock';
type ItemMetric = 'amount' | 'quantity';

interface Delta { up: boolean; text: string; }

const DEFAULT_PRESET = 'thisMonth';
const OVERVIEW_TOP_ITEMS = 5;
const CHART_TOP_ITEMS = 10;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, IconComponent, StockAlertsCardComponent, DateRangeFilterComponent,
    LineChartComponent, UpDownChartComponent, DonutChartComponent, RankBarsComponent, CountUpDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);
  private destroyRef = inject(DestroyRef);
  auth = inject(AuthService);
  tenant = inject(TenantService);

  readonly defaultPreset = DEFAULT_PRESET;
  readonly tabs: { id: DashboardTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'items', label: 'Sales & Items', icon: 'sale' },
    { id: 'money', label: 'Money', icon: 'voucher' },
    { id: 'ledger', label: 'Ledger', icon: 'ledger' },
    { id: 'stock', label: 'Stock', icon: 'stockledger' }
  ];

  tab = signal<DashboardTab>('overview');
  data = signal<DashboardAnalytics | null>(null);
  loading = signal(true);
  failed = signal(false);

  itemMetric = signal<ItemMetric>('amount');
  itemSearch = signal('');

  private requests = new Subject<{ from: string; to: string }>();

  labels = computed(() => {
    const d = this.data();
    if (!d) return [];
    const pattern = d.granularity === 'month' ? 'MMM yy' : 'dd MMM';
    return d.trend.map((p) => formatDate(p.date, pattern, 'en-US'));
  });

  salesSeries = computed<LineSeries[]>(() => {
    const t = this.data()?.trend ?? [];
    return [
      { name: 'Sales', color: 'var(--viz-1)', values: t.map((p) => p.sales) },
      { name: 'Purchases', color: 'var(--viz-2)', values: t.map((p) => p.purchases) }
    ];
  });
  cashSeries = computed<LineSeries[]>(() => {
    const t = this.data()?.trend ?? [];
    return [
      { name: 'Cash in', color: 'var(--viz-1)', values: t.map((p) => p.cashIn) },
      { name: 'Cash out', color: 'var(--viz-2)', values: t.map((p) => p.cashOut) }
    ];
  });
  stockSeries = computed<LineSeries[]>(() => {
    const t = this.data()?.trend ?? [];
    return [
      { name: 'Stock in', color: 'var(--viz-1)', values: t.map((p) => p.stockIn) },
      { name: 'Stock out', color: 'var(--viz-2)', values: t.map((p) => p.stockOut) }
    ];
  });
  netCash = computed(() => (this.data()?.trend ?? []).map((p) => p.cashIn - p.cashOut));

  /** Item ranking by the selected metric. Quantity rows show their own unit, since units can differ per item. */
  rankedItems = computed(() => {
    const metric = this.itemMetric();
    return [...(this.data()?.items ?? [])].sort((a, b) => b[metric] - a[metric]);
  });
  // Returns can push an item below zero for the period; it stays in the detail table but isn't a "top seller"
  topItemRows = computed<RankRow[]>(() =>
    this.rankedItems().filter((i) => i[this.itemMetric()] > 0).slice(0, CHART_TOP_ITEMS).map((i) => this.toItemRow(i)));
  overviewItemRows = computed<RankRow[]>(() =>
    (this.data()?.items ?? []).filter((i) => i.amount > 0).slice(0, OVERVIEW_TOP_ITEMS)
      .map((i) => ({ name: i.itemName, value: i.amount, previous: i.previousAmount })));
  itemsTotal = computed(() => (this.data()?.items ?? []).reduce((sum, i) => sum + i.amount, 0));
  filteredItems = computed(() => {
    const term = this.itemSearch().trim().toLowerCase();
    return this.rankedItems().filter((i) => !term || i.itemName.toLowerCase().includes(term) || i.categoryName.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.requests
      .pipe(
        switchMap(({ from, to }) => this.reportService.getDashboardAnalytics(from, to).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.failed.set(result === null);
        if (result) this.data.set(result);
      });

    const initial = DATE_PRESETS.find((p) => p.id === DEFAULT_PRESET)!.range();
    this.requests.next({ from: initial.from!, to: initial.to! });
  }

  onRange(range: DateRange): void {
    if (!range.from || !range.to) return; // a period needs both ends
    this.loading.set(true);
    this.requests.next({ from: range.from, to: range.to });
  }

  ranked(rows: RankedAmount[]): RankRow[] {
    return rows.map((r) => ({ name: r.name, value: r.amount, previous: r.previousAmount, note: `${r.invoices} inv.` }));
  }

  stockValueRows(d: DashboardAnalytics): RankRow[] {
    return d.topStockValue.map((s) => ({ name: s.itemName, value: s.stockValue, note: `${s.currentStock} ${s.unitOfMeasure}` }));
  }

  private toItemRow(i: DashboardItemSale): RankRow {
    return this.itemMetric() === 'amount'
      ? { name: i.itemName, value: i.amount, previous: i.previousAmount }
      : { name: i.itemName, value: i.quantity, note: i.unitOfMeasure, previous: null };
  }

  share(i: DashboardItemSale): number {
    const total = this.itemsTotal();
    return total > 0 ? (i.amount / total) * 100 : 0;
  }

  delta(current: number, previous: number): Delta | null {
    const pct = percentChange(current, previous);
    if (pct === null) return null;
    const size = Math.abs(pct);
    return { up: pct >= 0, text: `${size >= 1000 ? '999+' : size.toFixed(size < 10 ? 1 : 0)}%` };
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
