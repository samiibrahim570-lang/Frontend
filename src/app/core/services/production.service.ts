import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreateProductionRequest, ProductionResponse } from '../models/transactions.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private baseUrl = `${environment.apiUrl}/Production`;

  constructor(private http: HttpClient) {}

  getAll(request: PagedRequest): Observable<PagedResult<ProductionResponse>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);

    return this.http
      .get<ApiResponse<PagedResult<ProductionResponse>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }

  getById(id: number): Observable<ProductionResponse> {
    return this.http.get<ApiResponse<ProductionResponse>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: CreateProductionRequest): Observable<ProductionResponse> {
    return this.http.post<ApiResponse<ProductionResponse>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}
