import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreateGatePassRequest, GatePassResponse } from '../models/transactions.model';

@Injectable({ providedIn: 'root' })
export class GatePassService {
  private baseUrl = `${environment.apiUrl}/GatePass`;

  constructor(private http: HttpClient) {}

  getAll(request: PagedRequest, gatePassType?: string | null): Observable<PagedResult<GatePassResponse>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);
    if (gatePassType) params = params.set('gatePassType', gatePassType);

    return this.http
      .get<ApiResponse<PagedResult<GatePassResponse>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }

  getById(id: number): Observable<GatePassResponse> {
    return this.http.get<ApiResponse<GatePassResponse>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: CreateGatePassRequest): Observable<GatePassResponse> {
    return this.http.post<ApiResponse<GatePassResponse>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  cancel(id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}
