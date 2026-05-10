"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSchema, type Schema } from "@/lib/api";
import { useToken } from "@/components/providers/token-provider";

interface SchemaContextValue {
  schema: Schema | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextValue>({
  schema: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useSchema() {
  return useContext(SchemaContext);
}

export function SchemaProvider({ children }: { children: ReactNode }) {
  const { user } = useToken();
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
    if (!user) {
      setLoading(false);
      return;
    }
    void loadSchema();
  }, [user]);

  return (
    <SchemaContext.Provider value={{ schema, loading, error, refresh: loadSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}
