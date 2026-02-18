"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useSchema } from "./providers";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { schema, loading, error, mounted } = useSchema();

  // Render nothing until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to connect to API</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Make sure the InfernoCMS server is running
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar schema={schema} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
