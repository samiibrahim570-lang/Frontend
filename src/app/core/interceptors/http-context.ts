import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Background requests (e.g. stock alert polling) set this so failures don't raise error toasts. */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export const silentContext = () => new HttpContext().set(SILENT_ERRORS, true);
