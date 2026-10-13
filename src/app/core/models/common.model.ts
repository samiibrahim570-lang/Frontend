export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedRequest {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export const defaultPagedRequest: PagedRequest = {
  pageNumber: 1,
  pageSize: 20,
  search: null,
  fromDate: null,
  toDate: null
};
