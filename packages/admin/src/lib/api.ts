const API_BASE = '/api';

const fetchOpts: RequestInit = { credentials: 'include' };

export async function login(key: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/_auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ key }),
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/_auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export interface SchemaField {
  type: string;
  required: boolean;
  default?: unknown;
  options?: string[];
  integer?: boolean;
  maxLength?: number;
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
  const res = await fetch(`${API_BASE}/_schema`, fetchOpts);
  if (!res.ok) {
    const err = new Error('Failed to fetch schema');
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchCollection<T = Record<string, unknown>>(
  collection: string,
  params?: { page?: number; perPage?: number; sort?: string; depth?: number; search?: string }
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.perPage) searchParams.set('perPage', String(params.perPage));
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.depth !== undefined) searchParams.set('depth', String(params.depth));
  if (params?.search) searchParams.set('search', params.search);

  const url = `${API_BASE}/${collection}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url, fetchOpts);
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
  const res = await fetch(url, fetchOpts);
  if (!res.ok) throw new Error(`Failed to fetch ${collection}/${id}`);
  return res.json();
}

export async function createItem<T = Record<string, unknown>>(
  collection: string,
  data: Record<string, unknown>
): Promise<SingleResponse<T>> {
  const res = await fetch(`${API_BASE}/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to delete ${collection}/${id}`);
}

export async function uploadFile(file: File): Promise<SingleResponse<{ url: string; filename: string }>> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/_upload`, {
    method: 'POST',
    credentials: 'include',
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
  if (query) {
    searchParams.set('search', query);
  }

  const url = `${API_BASE}/${collection}?${searchParams}`;
  const res = await fetch(url, fetchOpts);
  if (!res.ok) throw new Error(`Failed to search ${collection}`);
  return res.json();
}
