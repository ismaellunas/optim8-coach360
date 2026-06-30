export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class NotImplementedAdapterError extends Error {
  constructor(adapter: string, method: string) {
    super(`${adapter}.${method} is not implemented yet`);
    this.name = 'NotImplementedAdapterError';
  }
}

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiAdapterMode = 'supabase' | 'rest';
