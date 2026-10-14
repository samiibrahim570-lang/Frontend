import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, fromEvent, interval, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ItemService } from './master.service';
import { ReportService } from './report.service';
import { ToastService } from './toast.service';
import { silentContext } from '../interceptors/http-context';

export type StockAlertStatus = 'out' | 'low';

export interface StockAlert {
  /** Item code - stable across both data sources */
  key: string;
  itemId: number | null;
  itemCode: string;
  itemName: string;
  categoryName: string;
  unitOfMeasure: string;
  currentStock: number;
  reorderLevel: number;
  status: StockAlertStatus;
  /** Quantity needed to get back to the reorder level */
  shortfall: number;
  /** 0-100, current stock as a share of the reorder level (for the stock bar) */
  stockPercent: number;
  /** When this item first dropped to/below its reorder level (ms epoch) */
  raisedAt: number;
  unread: boolean;
}

interface StockRow {
  id?: number;
  itemCode: string;
  itemName: string;
  categoryName?: string;
  unitOfMeasure: string;
  currentStock: number;
  reorderLevel: number;
}

/** Per-user persisted alert state: key -> { raisedAt, read } */
type StoredState = Record<string, { t: number; r: boolean }>;

const POLL_MS = 60_000;
const STALE_MS = 15_000;
const STORAGE_PREFIX = 'ffm_stock_alerts_';
const CHANNEL = 'ffm-stock';

/** Same rule the Item master and Stock report already use to colour stock red. */
export const isLowStock = (currentStock: number, reorderLevel: number) => currentStock <= reorderLevel;

/**
 * Single source of truth for low-stock alerts across the app (header bell, dashboard,
 * sidebar badge, item list). Refreshes:
 *  - on login / app start,
 *  - right after any request that can change stock (see stockChangeInterceptor),
 *  - when another tab changes stock (BroadcastChannel),
 *  - every minute while the tab is visible, and when the tab regains focus.
 * Alerts are resolved (removed) automatically once stock is replenished above the reorder level.
 */
@Injectable({ providedIn: 'root' })
export class StockAlertService {
  private document = inject(DOCUMENT);
  private auth = inject(AuthService);
  private itemService = inject(ItemService);
  private reportService = inject(ReportService);
  private toast = inject(ToastService);

  private changes$ = new Subject<void>();
  private manual$ = new Subject<void>();
  private channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  private userId: number | null = null;
  private stored: StoredState = {};
  private firstLoad = true;

  readonly alerts = signal<StockAlert[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  /** false when neither the Items nor the Stock report API is reachable for this user */
  readonly available = signal(true);
  readonly lastUpdated = signal<Date | null>(null);

  readonly count = computed(() => this.alerts().length);
  readonly unreadCount = computed(() => this.alerts().filter((a) => a.unread).length);
  readonly outOfStockCount = computed(() => this.alerts().filter((a) => a.status === 'out').length);
  /** Most severe first, then most recent */
  readonly bySeverity = computed(() =>
    [...this.alerts()].sort(
      (a, b) => (a.status === b.status ? 0 : a.status === 'out' ? -1 : 1) || b.raisedAt - a.raisedAt || a.stockPercent - b.stockPercent
    )
  );
  /** Most recent first */
  readonly latest = computed(() => [...this.alerts()].sort((a, b) => b.raisedAt - a.raisedAt || a.stockPercent - b.stockPercent));
  private keys = computed(() => new Set(this.alerts().map((a) => a.key)));

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (this.channel) {
      this.channel.onmessage = () => this.changes$.next();
      destroyRef.onDestroy(() => this.channel?.close());
    }

    this.auth.currentUser$
      .pipe(
        map((u) => u?.userId ?? null),
        distinctUntilChanged(),
        switchMap((userId) => {
          this.reset(userId);
          if (userId == null) return EMPTY;
          const visible = () => this.document.visibilityState !== 'hidden';
          return merge(
            of(null),
            this.manual$,
            this.changes$.pipe(debounceTime(400)),
            interval(POLL_MS).pipe(filter(visible)),
            fromEvent(this.document, 'visibilitychange').pipe(
              filter(() => visible() && Date.now() - (this.lastUpdated()?.getTime() ?? 0) > STALE_MS)
            )
          ).pipe(
            switchMap(() => {
              this.loading.set(true);
              return this.fetchRows();
            })
          );
        }),
        takeUntilDestroyed(destroyRef)
      )
      .subscribe((rows) => this.applyRows(rows));
  }

  /** Call after anything that may have changed stock. Also notifies other open tabs. */
  notifyStockChanged(): void {
    this.changes$.next();
    this.channel?.postMessage('changed');
  }

  refresh(): void {
    this.manual$.next();
  }

  isLow(itemCode: string): boolean {
    return this.keys().has(itemCode);
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    for (const a of this.alerts()) if (this.stored[a.key]) this.stored[a.key].r = true;
    this.persist();
    this.alerts.update((list) => list.map((a) => ({ ...a, unread: false })));
  }

  /** Items API first (has ids); falls back to the low-stock report for roles without Item access. */
  private fetchRows(): Observable<StockRow[] | null> {
    const ctx = silentContext();
    return this.itemService.getAll(undefined, undefined, ctx).pipe(
      map((items) => items.filter((i) => isLowStock(i.currentStock, i.reorderLevel)) as StockRow[]),
      catchError(() =>
        this.reportService.getStockReport(true, ctx).pipe(
          map((rows) => rows.filter((r) => isLowStock(r.currentStock, r.reorderLevel)) as StockRow[])
        )
      ),
      catchError(() => of(null))
    );
  }

  private applyRows(rows: StockRow[] | null): void {
    this.loading.set(false);
    if (rows == null) {
      // Keep showing the last known alerts if a refresh fails; only flag unavailable if we never loaded.
      if (!this.loaded()) this.available.set(false);
      return;
    }
    this.available.set(true);

    const now = Date.now();
    const prevKeys = this.keys();
    const next: StoredState = {};
    const alerts = rows.map((r) => {
      const key = r.itemCode;
      const prev = this.stored[key];
      next[key] = prev ?? { t: now, r: false };
      const reorder = Number(r.reorderLevel) || 0;
      const stock = Number(r.currentStock) || 0;
      return {
        key,
        itemId: r.id ?? null,
        itemCode: r.itemCode,
        itemName: r.itemName,
        categoryName: r.categoryName ?? '',
        unitOfMeasure: r.unitOfMeasure,
        currentStock: stock,
        reorderLevel: reorder,
        status: stock <= 0 ? 'out' : 'low',
        shortfall: Math.max(reorder - stock, 0),
        stockPercent: reorder > 0 ? Math.max(0, Math.min(100, (stock / reorder) * 100)) : 0,
        raisedAt: next[key].t,
        unread: !next[key].r
      } as StockAlert;
    });

    if (!this.firstLoad) {
      const raised = alerts.filter((a) => !prevKeys.has(a.key));
      const resolved = [...prevKeys].filter((k) => !next[k]);
      if (raised.length === 1) {
        const a = raised[0];
        this.toast.warning(`${a.status === 'out' ? 'Out of stock' : 'Low stock'}: ${a.itemName} (${this.fmt(a.currentStock)} ${a.unitOfMeasure} left)`);
      } else if (raised.length > 1) {
        this.toast.warning(`${raised.length} more items have reached their reorder level.`);
      }
      if (resolved.length) {
        const names = this.alerts().filter((a) => resolved.includes(a.key)).map((a) => a.itemName);
        this.toast.success(
          names.length === 1 ? `${names[0]} restocked - alert resolved.` : `${names.length} items restocked - alerts resolved.`
        );
      }
    } else {
      const unread = alerts.filter((a) => a.unread).length;
      if (unread) this.toast.warning(`${unread} item${unread > 1 ? 's need' : ' needs'} restocking. Check the notification bell.`);
    }

    this.firstLoad = false;
    this.stored = next;
    this.persist();
    this.alerts.set(alerts);
    this.loaded.set(true);
    this.lastUpdated.set(new Date());
  }

  private reset(userId: number | null): void {
    this.userId = userId;
    this.firstLoad = true;
    this.stored = userId == null ? {} : this.load(userId);
    this.alerts.set([]);
    this.loaded.set(false);
    this.loading.set(false);
    this.available.set(true);
    this.lastUpdated.set(null);
  }

  private fmt(n: number): string {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  private load(userId: number): StoredState {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) || '{}') ?? {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    if (this.userId == null) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + this.userId, JSON.stringify(this.stored));
    } catch {
      /* ignore */
    }
  }
}
