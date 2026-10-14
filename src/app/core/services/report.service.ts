import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import {
  DashboardSummary,
  ProductionReportItem,
  PurchaseReportItem,
  SaleReportItem,
  StockReportItem
} from '../models/transactions.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private baseUrl = `${environment.apiUrl}/Reports`;

  constructor(private http: HttpClient) {}

  getSaleReport(from?: string | null, to?: string | null, customerId?: number | null): Observable<SaleReportItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (customerId) params = params.set('customerId', customerId);
    return this.http.get<ApiResponse<SaleReportItem[]>>(`${this.baseUrl}/sale`, { params }).pipe(map((r) => r.data));
  }

  getPurchaseReport(from?: string | null, to?: string | null, supplierId?: number | null): Observable<PurchaseReportItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<ApiResponse<PurchaseReportItem[]>>(`${this.baseUrl}/purchase`, { params }).pipe(map((r) => r.data));
  }

  getProductionReport(from?: string | null, to?: string | null): Observable<ProductionReportItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<ProductionReportItem[]>>(`${this.baseUrl}/production`, { params }).pipe(map((r) => r.data));
  }

  getStockReport(lowStockOnly?: boolean, context?: HttpContext): Observable<StockReportItem[]> {
    let params = new HttpParams();
    if (lowStockOnly) params = params.set('lowStockOnly', lowStockOnly);
    return this.http.get<ApiResponse<StockReportItem[]>>(`${this.baseUrl}/stock`, { params, context }).pipe(map((r) => r.data));
  }

  getDashboard(): Observable<DashboardSummary> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.baseUrl}/dashboard`).pipe(map((r) => r.data));
  }
}
