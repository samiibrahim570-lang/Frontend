import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/common.model';
import { SearchResult } from '../../../core/models/tenant.model';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../icon/icon.component';
import { MENU_ICON_MAP } from '../../config/menu-groups.config';
import { silentContext } from '../../../core/interceptors/http-context';

interface Hit extends SearchResult { icon: string; }

/**
 * Header quick search (Ctrl+K / Cmd+K). Pages/menus are matched locally from the user's visible menus;
 * customers, suppliers, products, invoices, returns, vouchers... come from GET /api/Search, which only
 * searches the selected company/branch and only the modules the user may view.
 */
@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss'
})
export class GlobalSearchComponent implements OnDestroy {
  @ViewChild('input') input?: ElementRef<HTMLInputElement>;

  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
  private host = inject(ElementRef);

  term = signal('');
  open = signal(false);
  loading = signal(false);
  serverHits = signal<Hit[]>([]);
  active = signal(0);

  readonly isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  pageHits = computed<Hit[]>(() => {
    const q = this.term().trim().toLowerCase();
    if (!q) return [];
    return this.auth.visibleMenus
      .filter((m) => !!m.route && (m.menuName.toLowerCase().includes(q) || m.menuKey.toLowerCase().includes(q)))
      .slice(0, 6)
      .map((m) => ({
        type: 'Page', title: m.menuName, subtitle: m.route, route: m.route!, id: null,
        icon: MENU_ICON_MAP[m.menuKey.toUpperCase()] || 'dashboard'
      }));
  });

  hits = computed<Hit[]>(() => [...this.pageHits(), ...this.serverHits()]);

  /** Results grouped by type, keeping the flat index for keyboard navigation. */
  groups = computed(() => {
    const out: { type: string; items: { hit: Hit; index: number }[] }[] = [];
    this.hits().forEach((hit, index) => {
      let g = out.find((x) => x.type === hit.type);
      if (!g) out.push((g = { type: hit.type, items: [] }));
      g.items.push({ hit, index });
    });
    return out;
  });

  private search$ = new Subject<string>();
  private sub: Subscription;

  constructor() {
    this.sub = this.search$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) return of([] as SearchResult[]);
        this.loading.set(true);
        return this.http
          .get<ApiResponse<SearchResult[]>>(`${environment.apiUrl}/Search`, { params: { q: q.trim() }, context: silentContext() })
          .pipe(map((r) => r.data ?? []), catchError(() => of([] as SearchResult[])));
      })
    ).subscribe((results) => {
      this.loading.set(false);
      this.serverHits.set(results.map((r) => ({ ...r, icon: iconFor(r.type) })));
      this.active.set(0);
    });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.input?.nativeElement.focus();
      this.input?.nativeElement.select();
      this.open.set(true);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.host.nativeElement.contains(e.target)) this.open.set(false);
  }

  onInput(value: string): void {
    this.term.set(value);
    this.open.set(true);
    this.active.set(0);
    if (value.trim().length < 2) this.serverHits.set([]);
    this.search$.next(value);
  }

  onKey(e: KeyboardEvent): void {
    const count = this.hits().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (count) this.active.set((this.active() + 1) % count); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (count) this.active.set((this.active() - 1 + count) % count); }
    else if (e.key === 'Enter') { e.preventDefault(); const h = this.hits()[this.active()]; if (h) this.go(h); }
    else if (e.key === 'Escape') { this.open.set(false); this.input?.nativeElement.blur(); }
  }

  go(hit: Hit): void {
    this.open.set(false);
    this.term.set('');
    this.serverHits.set([]);
    if (this.input) this.input.nativeElement.value = '';
    // printable documents open in their own tab like everywhere else in the app
    if (hit.route.startsWith('/print/')) {
      window.open(this.router.serializeUrl(this.router.parseUrl(hit.route)), '_blank');
    } else {
      this.router.navigateByUrl(hit.route);
    }
  }
}

function iconFor(type: string): string {
  switch (type) {
    case 'Customer': return 'customer';
    case 'Supplier': return 'supplier';
    case 'Product': return 'item';
    case 'Sale Invoice': return 'sale';
    case 'Purchase Bill': return 'purchase';
    case 'Sale Return': return 'salereturn';
    case 'Purchase Return': return 'purchasereturn';
    case 'Voucher': return 'voucher';
    case 'Gate Pass': return 'gatepass';
    case 'Production': return 'production';
    default: return 'search';
  }
}
