"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSchema, type Schema } from "@/lib/api";

interface SchemaContextValue {
  schema: Schema | null;
  loading: boolean;
  error: string | null;
  requiresAuth: boolean;
  mounted: boolean;
  refresh: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextValue>({
  schema: null,
  loading: true,
  error: null,
  requiresAuth: false,
  mounted: false,
  refresh: async () => {},
});

export function useSchema() {
  return useContext(SchemaContext);
}

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      setRequiresAuth(false);
      const data = await fetchSchema();
      setSchema(data);
    } catch (err: any) {
      if (err.status === 403) {
        setRequiresAuth(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load schema");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadSchema();
  }, []);

  return (
    <SchemaContext.Provider value={{ schema, loading, error, requiresAuth, mounted, refresh: loadSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}
