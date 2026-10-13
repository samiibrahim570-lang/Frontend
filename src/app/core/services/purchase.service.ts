import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreatePurchaseRequest, PurchaseResponse } from '../models/sale-purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private baseUrl = `${environment.apiUrl}/Purchases`;

  constructor(private http: HttpClient) {}

  getAll(request: PagedRequest, supplierId?: number | null): Observable<PagedResult<PurchaseResponse>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);
    if (supplierId) params = params.set('supplierId', supplierId);

    return this.http
      .get<ApiResponse<PagedResult<PurchaseResponse>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }

  getById(id: number): Observable<PurchaseResponse> {
    return this.http.get<ApiResponse<PurchaseResponse>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: CreatePurchaseRequest): Observable<PurchaseResponse> {
    return this.http.post<ApiResponse<PurchaseResponse>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}
