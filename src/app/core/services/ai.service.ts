import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/common.model';
import { SILENT_ERRORS } from '../interceptors/http-context';

export type ImportEntity = 'customer' | 'supplier' | 'item';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatReply {
  reply: string;
  toolsUsed: string[];
  inputTokens: number;
  outputTokens: number;
  mode: 'ai' | 'rules';
}

export interface AssistantStatus {
  mode: 'ai' | 'rules';
  quickQuestions: string[];
}

export interface ImportField {
  field: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'bool';
  hint: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ColumnMappingResult {
  mappings: ColumnMapping[];
  notes?: string | null;
  fields: ImportField[];
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  committed: boolean;
  totalRows: number;
  validRows: number;
  imported: number;
  errors: ImportRowError[];
  newCategories: string[];
}

/** AI calls handle their own errors inline, so the global error toast is switched off for them. */
@Injectable({ providedIn: 'root' })
export class AiService {
  private base = environment.apiUrl;
  private silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

  constructor(private http: HttpClient) {}

  status(): Observable<AssistantStatus> {
    return this.http.get<ApiResponse<AssistantStatus>>(`${this.base}/Assistant/status`, this.silent()).pipe(map((r) => r.data));
  }

  chat(history: ChatTurn[], message: string): Observable<ChatReply> {
    return this.http
      .post<ApiResponse<ChatReply>>(`${this.base}/Assistant/chat`, { history, message }, this.silent())
      .pipe(map((r) => r.data));
  }

  mapColumns(entityType: ImportEntity, headers: string[], sampleRows: (string | null)[][]): Observable<ColumnMappingResult> {
    return this.http
      .post<ApiResponse<ColumnMappingResult>>(`${this.base}/Assistant/map-columns`, { entityType, headers, sampleRows }, this.silent())
      .pipe(map((r) => r.data));
  }

  importFields(entity: ImportEntity): Observable<ImportField[]> {
    return this.http.get<ApiResponse<ImportField[]>>(`${this.base}/Import/fields/${entity}`).pipe(map((r) => r.data));
  }

  importRows(entity: ImportEntity, rows: Record<string, string | null>[], commit: boolean, createMissingCategories: boolean): Observable<ApiResponse<ImportResult>> {
    const params = new HttpParams().set('commit', commit);
    return this.http.post<ApiResponse<ImportResult>>(`${this.base}/Import/${entity}`, { rows, createMissingCategories }, { params, ...this.silent() });
  }
}

/** Reads the message from an API error response. */
export function apiErrorMessage(err: any, fallback = 'Something went wrong.'): string {
  return err?.error?.message || err?.message || fallback;
}
