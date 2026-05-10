import { getToken } from "./token-store";

const API_BASE =
  process.env.NEXT_PUBLIC_INFERNOCMS_API_URL ?? "http://localhost:4000/api";

function authHeaders(extra?: HeadersInit, explicitToken?: string): HeadersInit {
  const t = explicitToken ?? getToken();
  const h: Record<string, string> = { ...(extra as Record<string, string> | undefined) };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const j = (await res.json()) as { data?: unknown };
  return (j?.data ?? j) as T;
}

// === Auth / token management ===

export interface Me {
  id: string;
  name: string;
  scope: "read" | "write" | "admin";
}

export async function getMe(explicitToken?: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/_auth/me`, {
    headers: authHeaders(undefined, explicitToken),
  });
  return unwrap<Me>(res);
}

export interface TokenSummary {
  id: string;
  name: string;
  scope: "read" | "write" | "admin";
  created_at: string;
  last_used_at: string | null;
}

export async function listAuthTokens(): Promise<TokenSummary[]> {
  const res = await fetch(`${API_BASE}/_tokens`, { headers: authHeaders() });
  return unwrap<TokenSummary[]>(res);
}

export interface MintedToken {
  id: string;
  name: string;
  scope: "read" | "write" | "admin";
  plaintext: string;
}

export async function createAuthToken(
  name: string,
  scope: "read" | "write" | "admin"
): Promise<MintedToken> {
  const res = await fetch(`${API_BASE}/_tokens`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, scope }),
  });
  return unwrap<MintedToken>(res);
}

export async function revokeAuthToken(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/_tokens/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await unwrap<void>(res);
}

// === Schema ===

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
  const res = await fetch(`${API_BASE}/_schema`, { headers: authHeaders() });
  if (!res.ok) {
    const err = new ApiError(res.status, "Failed to fetch schema");
    throw err;
  }
  return res.json();
}

export async function fetchCollection<T = Record<string, unknown>>(
  collection: string,
  params?: { page?: number; perPage?: number; sort?: string; depth?: number; search?: string }
): Promise<PaginatedResponse<T>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.perPage) sp.set("perPage", String(params.perPage));
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.depth !== undefined) sp.set("depth", String(params.depth));
  if (params?.search) sp.set("search", params.search);
  const url = `${API_BASE}/${collection}${sp.toString() ? `?${sp}` : ""}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `Failed to fetch ${collection}`);
  return res.json();
}

export async function fetchItem<T = Record<string, unknown>>(
  collection: string,
  id: number | string,
  depth?: number
): Promise<SingleResponse<T>> {
  const sp = new URLSearchParams();
  if (depth !== undefined) sp.set("depth", String(depth));
  const url = `${API_BASE}/${collection}/${id}${sp.toString() ? `?${sp}` : ""}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `Failed to fetch ${collection}/${id}`);
  return res.json();
}

export async function createItem<T = Record<string, unknown>>(
  collection: string,
  data: Record<string, unknown>
): Promise<SingleResponse<T>> {
  const res = await fetch(`${API_BASE}/${collection}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `Failed to create ${collection}`);
  return res.json();
}

export async function updateItem<T = Record<string, unknown>>(
  collection: string,
  id: number | string,
  data: Record<string, unknown>
): Promise<SingleResponse<T>> {
  const res = await fetch(`${API_BASE}/${collection}/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `Failed to update ${collection}/${id}`);
  return res.json();
}

export async function deleteItem(
  collection: string,
  id: number | string
): Promise<void> {
  const res = await fetch(`${API_BASE}/${collection}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `Failed to delete ${collection}/${id}`);
}

export async function uploadFile(file: File): Promise<SingleResponse<{ url: string; filename: string }>> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/_upload`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to upload file");
  return res.json();
}

export async function searchCollection<T = Record<string, unknown>>(
  collection: string,
  query?: string
): Promise<PaginatedResponse<T>> {
  const sp = new URLSearchParams();
  sp.set("perPage", "50");
  if (query) sp.set("search", query);
  const url = `${API_BASE}/${collection}?${sp}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `Failed to search ${collection}`);
  return res.json();
}
