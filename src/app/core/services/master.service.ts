import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { CrudService } from './crud.service';
import { Booker, Category, Customer, Item, Supplier } from '../models/master.model';
import { ApiResponse } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudService<Category> {
  constructor(http: HttpClient) {
    super(http, 'Categories');
  }
}

@Injectable({ providedIn: 'root' })
export class ItemService extends CrudService<Item> {
  constructor(http: HttpClient) {
    super(http, 'Items');
  }

  // Override to support rawMaterialOnly/finishedGoodOnly query filters used by Production forms
  override getAll(rawMaterialOnly?: boolean, finishedGoodOnly?: boolean) {
    let params = new HttpParams();
    if (rawMaterialOnly) params = params.set('rawMaterialOnly', rawMaterialOnly);
    if (finishedGoodOnly) params = params.set('finishedGoodOnly', finishedGoodOnly);

    return this.http
      .get<ApiResponse<Item[]>>(this.baseUrl, { params })
      .pipe(map((r) => r.data));
  }
}

@Injectable({ providedIn: 'root' })
export class CustomerService extends CrudService<Customer> {
  constructor(http: HttpClient) {
    super(http, 'Customers');
  }
}

@Injectable({ providedIn: 'root' })
export class SupplierService extends CrudService<Supplier> {
  constructor(http: HttpClient) {
    super(http, 'Suppliers');
  }
}

@Injectable({ providedIn: 'root' })
export class BookerService extends CrudService<Booker> {
  constructor(http: HttpClient) {
    super(http, 'Bookers');
  }
}
