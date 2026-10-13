import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreateVoucherRequest, VoucherResponse } from '../models/transactions.model';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private baseUrl = `${environment.apiUrl}/Vouchers`;

  constructor(private http: HttpClient) {}

  getAll(request: PagedRequest): Observable<PagedResult<VoucherResponse>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);

    return this.http
      .get<ApiResponse<PagedResult<VoucherResponse>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }

  create(payload: CreateVoucherRequest): Observable<VoucherResponse> {
    return this.http.post<ApiResponse<VoucherResponse>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}
