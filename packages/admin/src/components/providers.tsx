"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSchema, type Schema } from "@/lib/api";

interface SchemaContextValue {
  schema: Schema | null;
  loading: boolean;
  error: string | null;
  mounted: boolean;
  refresh: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextValue>({
  schema: null,
  loading: true,
  error: null,
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

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSchema();
      setSchema(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadSchema();
  }, []);

  return (
    <SchemaContext.Provider value={{ schema, loading, error, mounted, refresh: loadSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}
