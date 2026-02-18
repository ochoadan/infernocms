const API_BASE = '/api';

function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const adminKey = localStorage.getItem('infernocms-admin-key') ?? '';
    if (adminKey) {
      headers['X-Admin-Key'] = adminKey;
    }
  }
  return headers;
}

export interface SchemaField {
  type: string;
  required: boolean;
  default?: unknown;
  options?: string[];
  integer?: boolean;
  collection?: string;
  many?: boolean;
  from?: string;
  allowed?: string[];
  fields?: Record<string, SchemaField>;
}

export interface SchemaBlock {
  name: string;
  fields: Record<string, SchemaField>;
}

export interface SchemaCollection {
  name: string;
  fields: Record<string, SchemaField>;
}

export interface Schema {
  collections: Record<string, SchemaCollection>;
  blocks?: Record<string, SchemaBlock>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export async function fetchSchema(): Promise<Schema> {
  const res = await fetch(`${API_BASE}/_schema`, {
    headers: getAdminHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch schema');
  return res.json();
}

export async function fetchCollection<T = Record<string, unknown>>(
  collection: string,
  params?: { page?: number; perPage?: number; sort?: string; depth?: number }
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.perPage) searchParams.set('perPage', String(params.perPage));
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.depth !== undefined) searchParams.set('depth', String(params.depth));

  const url = `${API_BASE}/${collection}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url, { headers: getAdminHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch ${collection}`);
  return res.json();
}

export async function fetchItem<T = Record<string, unknown>>(
  collection: string,
  id: number | string,
  depth?: number
): Promise<SingleResponse<T>> {
  const searchParams = new URLSearchParams();
  if (depth !== undefined) searchParams.set('depth', String(depth));

  const url = `${API_BASE}/${collection}/${id}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url, { headers: getAdminHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch ${collection}/${id}`);
  return res.json();
}

export async function createItem<T = Record<string, unknown>>(
  collection: string,
  data: Record<string, unknown>
): Promise<SingleResponse<T>> {
  const res = await fetch(`${API_BASE}/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create ${collection}`);
  return res.json();
}

export async function updateItem<T = Record<string, unknown>>(
  collection: string,
  id: number | string,
  data: Record<string, unknown>
): Promise<SingleResponse<T>> {
  const res = await fetch(`${API_BASE}/${collection}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update ${collection}/${id}`);
  return res.json();
}

export async function deleteItem(
  collection: string,
  id: number | string
): Promise<void> {
  const res = await fetch(`${API_BASE}/${collection}/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete ${collection}/${id}`);
}

export async function uploadFile(file: File): Promise<SingleResponse<{ url: string; filename: string }>> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/_upload`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

export async function searchCollection<T = Record<string, unknown>>(
  collection: string,
  query?: string
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams();
  searchParams.set('perPage', '50');
  if (query) searchParams.set('sort', 'createdAt');

  const url = `${API_BASE}/${collection}?${searchParams}`;
  const res = await fetch(url, { headers: getAdminHeaders() });
  if (!res.ok) throw new Error(`Failed to search ${collection}`);
  return res.json();
}
