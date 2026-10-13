import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { ItemStockLedger, LedgerReport, PartyBalanceSummary } from '../models/transactions.model';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private baseUrl = `${environment.apiUrl}/Ledger`;

  constructor(private http: HttpClient) {}

  private dateParams(from?: string | null, to?: string | null): HttpParams {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return params;
  }

  getCustomerLedger(customerId: number, from?: string | null, to?: string | null): Observable<LedgerReport> {
    return this.http
      .get<ApiResponse<LedgerReport>>(`${this.baseUrl}/customer/${customerId}`, { params: this.dateParams(from, to) })
      .pipe(map((r) => r.data));
  }

  getSupplierLedger(supplierId: number, from?: string | null, to?: string | null): Observable<LedgerReport> {
    return this.http
      .get<ApiResponse<LedgerReport>>(`${this.baseUrl}/supplier/${supplierId}`, { params: this.dateParams(from, to) })
      .pipe(map((r) => r.data));
  }

  getCustomerBalances(): Observable<PartyBalanceSummary[]> {
    return this.http
      .get<ApiResponse<PartyBalanceSummary[]>>(`${this.baseUrl}/customer-balances`)
      .pipe(map((r) => r.data));
  }

  getSupplierBalances(): Observable<PartyBalanceSummary[]> {
    return this.http
      .get<ApiResponse<PartyBalanceSummary[]>>(`${this.baseUrl}/supplier-balances`)
      .pipe(map((r) => r.data));
  }
}

@Injectable({ providedIn: 'root' })
export class StockLedgerService {
  private baseUrl = `${environment.apiUrl}/StockLedger`;

  constructor(private http: HttpClient) {}

  getItemStockLedger(itemId: number, from?: string | null, to?: string | null): Observable<ItemStockLedger> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http
      .get<ApiResponse<ItemStockLedger>>(`${this.baseUrl}/item/${itemId}`, { params })
      .pipe(map((r) => r.data));
  }
}
