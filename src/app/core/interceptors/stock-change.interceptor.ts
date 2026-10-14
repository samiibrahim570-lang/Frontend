import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { tap } from 'rxjs';
import { StockAlertService } from '../services/stock-alert.service';

/**
 * Controllers whose write operations move stock: item master (opening stock / reorder level),
 * sales, purchases, production and gate passes (create, cancel, confirm, ...).
 */
const STOCK_CONTROLLERS = /\/api\/(Items|Sales|Purchases|Productions?|GatePass(?:es)?)(\/|\?|$)/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Refreshes low-stock alerts app-wide as soon as a stock-changing request succeeds. */
export const stockChangeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!WRITE_METHODS.has(req.method) || !STOCK_CONTROLLERS.test(req.url)) return next(req);

  // Resolve lazily: StockAlertService itself depends on HttpClient.
  const injector = inject(Injector);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok) injector.get(StockAlertService).notifyStockChanged();
    })
  );
};
