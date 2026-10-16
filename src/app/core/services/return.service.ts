import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedRequest, PagedResult } from '../models/common.model';
import { CreateReturnRequest, ReturnDoc, ReturnKind, ReturnableInvoice } from '../models/return.model';

/** Sale Returns (/api/SaleReturns) and Purchase Returns (/api/PurchaseReturns) behind one API. */
@Injectable({ providedIn: 'root' })
export class ReturnService {
  constructor(private http: HttpClient) {}

  private url(kind: ReturnKind): string {
    return `${environment.apiUrl}/${kind === 'sale' ? 'SaleReturns' : 'PurchaseReturns'}`;
  }

  getAll(kind: ReturnKind, request: PagedRequest): Observable<PagedResult<ReturnDoc>> {
    let params = new HttpParams().set('pageNumber', request.pageNumber).set('pageSize', request.pageSize);
    if (request.search) params = params.set('search', request.search);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);
    return this.http.get<ApiResponse<PagedResult<any>>>(this.url(kind), { params }).pipe(
      map((r) => ({ ...r.data, items: r.data.items.map((x) => normalise(kind, x)) }))
    );
  }

  getById(kind: ReturnKind, id: number): Observable<ReturnDoc> {
    return this.http.get<ApiResponse<any>>(`${this.url(kind)}/${id}`).pipe(map((r) => normalise(kind, r.data)));
  }

  getReturnable(kind: ReturnKind, invoiceId: number): Observable<ReturnableInvoice> {
    return this.http.get<ApiResponse<ReturnableInvoice>>(`${this.url(kind)}/returnable/${invoiceId}`).pipe(map((r) => r.data));
  }

  create(kind: ReturnKind, req: CreateReturnRequest): Observable<ReturnDoc> {
    const { invoiceId, ...rest } = req;
    const payload = kind === 'sale' ? { ...rest, saleMasterId: invoiceId } : { ...rest, purchaseMasterId: invoiceId };
    return this.http.post<ApiResponse<any>>(this.url(kind), payload).pipe(map((r) => normalise(kind, r.data)));
  }

  cancel(kind: ReturnKind, id: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.url(kind)}/${id}/cancel`, {}).pipe(map(() => void 0));
  }
}

function normalise(kind: ReturnKind, x: any): ReturnDoc {
  return {
    ...x,
    invoiceId: kind === 'sale' ? x.saleMasterId : x.purchaseMasterId,
    invoiceNo: kind === 'sale' ? x.saleInvoiceNo : x.purchaseInvoiceNo,
    invoiceDate: kind === 'sale' ? x.saleInvoiceDate : x.purchaseInvoiceDate,
    partyId: kind === 'sale' ? x.customerId : x.supplierId,
    partyName: kind === 'sale' ? x.customerName : x.supplierName
  };
}
