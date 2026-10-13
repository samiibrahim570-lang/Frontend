import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreateSaleRequest, SaleResponse } from '../models/sale-purchase.model';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private baseUrl = `${environment.apiUrl}/Sales`;

  constructor(private http: HttpClient) {}

  getAll(request: PagedRequest, customerId?: number | null): Observable<PagedResult<SaleResponse>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);
    if (customerId) params = params.set('customerId', customerId);

    return this.http
      .get<ApiResponse<PagedResult<SaleResponse>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }

  getById(id: number): Observable<SaleResponse> {
    return this.http.get<ApiResponse<SaleResponse>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: CreateSaleRequest): Observable<SaleResponse> {
    return this.http.post<ApiResponse<SaleResponse>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}
