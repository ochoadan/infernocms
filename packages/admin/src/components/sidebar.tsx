"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Database02Icon,
  File02Icon,
  Home01Icon,
  Settings01Icon,
} from "@/lib/icons";
import type { Schema } from "@/lib/api";

interface SidebarProps {
  schema: Schema | null;
}

export function Sidebar({ schema }: SidebarProps) {
  const pathname = usePathname();

  const collections = schema ? Object.keys(schema.collections) : [];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/" className="flex items-center gap-3 font-semibold text-sidebar-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Database02Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg">InfernoCMS</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            pathname === "/"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Home01Icon className="h-5 w-5" />
          Dashboard
        </Link>

        <div className="pt-6">
          <h4 className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Collections
          </h4>
          <div className="space-y-1">
            {collections.map((collection) => (
              <Link
                key={collection}
                href={`/collections/${collection}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith(`/collections/${collection}`)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <File02Icon className="h-5 w-5" />
                {collection.charAt(0).toUpperCase() + collection.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Settings01Icon className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  );
}
