import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';

/**
 * Base class for simple master-data CRUD (Category, Item, Customer, Supplier, Booker, Role, Menu).
 * Extend it and pass the controller name, e.g.:
 *   class CategoryService extends CrudService<Category> { constructor(http: HttpClient) { super(http, 'Categories'); } }
 */
export class CrudService<T> {
  protected baseUrl: string;

  constructor(protected http: HttpClient, controllerName: string) {
    this.baseUrl = `${environment.apiUrl}/${controllerName}`;
  }

  getAll(): Observable<T[]> {
    return this.http.get<ApiResponse<T[]>>(this.baseUrl).pipe(map((r) => r.data));
  }

  getById(id: number): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.baseUrl, payload).pipe(map((r) => r.data));
  }

  update(id: number, payload: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${id}`, payload).pipe(map((r) => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }
}
