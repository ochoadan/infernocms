"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Search01Icon,
} from "@/lib/icons";
import type { SchemaField } from "@/lib/api";

interface DataTableProps {
  data: Record<string, unknown>[];
  fields: Record<string, SchemaField>;
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  sort?: string;
  search?: string;
  onPageChange: (page: number) => void;
  onSortChange?: (sort: string) => void;
  onSearchChange?: (search: string) => void;
  onPerPageChange?: (perPage: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatValue(value: unknown, field: SchemaField): string {
  if (value === null || value === undefined) {
    return "-";
  }

  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "datetime":
      return new Date(value as string).toLocaleString();
    case "date":
      return new Date(value as string).toLocaleDateString();
    case "json":
      return JSON.stringify(value).slice(0, 50) + "...";
    case "relation": {
      if (field.many && Array.isArray(value)) {
        return value
          .map((v) => {
            if (typeof v === "object" && v !== null) {
              const obj = v as Record<string, unknown>;
              return obj.name ?? obj.title ?? `#${obj.id}`;
            }
            return `#${v}`;
          })
          .join(", ");
      }
      if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;
        return String(obj.name ?? obj.title ?? `#${obj.id}`);
      }
      return `#${value}`;
    }
    case "slug": {
      const str = String(value);
      return str.length > 50 ? str.slice(0, 50) + "..." : str;
    }
    case "image":
      return value ? "[image]" : "-";
    case "file": {
      if (typeof value === "string") {
        const filename = value.split("/").pop();
        return filename ?? value;
      }
      return String(value);
    }
    case "richtext": {
      if (Array.isArray(value)) {
        const text = value
          .map((node: Record<string, unknown>) => {
            if (Array.isArray(node.children)) {
              return (node.children as Record<string, unknown>[])
                .map((child) => (typeof child.text === "string" ? child.text : ""))
                .join("");
            }
            return "";
          })
          .join(" ")
          .trim();
        return text.length > 50 ? text.slice(0, 50) + "..." : text || "-";
      }
      return "-";
    }
    case "blocks": {
      if (Array.isArray(value)) {
        const count = value.length;
        return `${count} block${count !== 1 ? "s" : ""}`;
      }
      return "-";
    }
    case "link": {
      if (typeof value === "object" && value !== null) {
        const link = value as Record<string, unknown>;
        return (link.url as string) ?? "-";
      }
      return "-";
    }
    case "group":
      return "[group]";
    case "array": {
      if (Array.isArray(value)) {
        return `${value.length} item${value.length !== 1 ? "s" : ""}`;
      }
      return "-";
    }
    default: {
      const str = String(value);
      return str.length > 50 ? str.slice(0, 50) + "..." : str;
    }
  }
}

// Fields that aren't useful as table columns
const SKIP_COLUMN_TYPES = new Set(["richtext", "blocks", "json", "group", "array"]);
const MAX_DISPLAY_FIELDS = 6;

const PER_PAGE_OPTIONS = [10, 25, 50];

export function DataTable({
  data,
  fields,
  meta,
  sort,
  search,
  onPageChange,
  onSortChange,
  onSearchChange,
  onPerPageChange,
  onEdit,
  onDelete,
}: DataTableProps) {
  const [searchInput, setSearchInput] = useState(search ?? "");

  const fieldNames = Object.keys(fields);
  // Show simple fields first, then complex ones, up to MAX_DISPLAY_FIELDS
  const sortedFieldNames = [
    ...fieldNames.filter((f) => !SKIP_COLUMN_TYPES.has(fields[f].type)),
    ...fieldNames.filter((f) => SKIP_COLUMN_TYPES.has(fields[f].type)),
  ];
  const displayFields = sortedFieldNames.slice(0, MAX_DISPLAY_FIELDS);
  const colCount = displayFields.length + 2;

  // Parse current sort
  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort ?? "";
  const sortDir = sort?.startsWith("-") ? "desc" : "asc";

  const handleSort = (field: string) => {
    if (!onSortChange) return;
    if (sortField === field) {
      // Toggle direction
      onSortChange(sortDir === "asc" ? `-${field}` : field);
    } else {
      onSortChange(`-${field}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(searchInput);
  };

  return (
    <div>
      {onSearchChange && (
        <div className="border-b px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search01Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" size="default">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={() => {
                  setSearchInput("");
                  onSearchChange("");
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">
              <SortableHeader
                label="ID"
                field="id"
                sortField={sortField}
                sortDir={sortDir}
                onSort={onSortChange ? handleSort : undefined}
              />
            </TableHead>
            {displayFields.map((field) => (
              <TableHead key={field}>
                <SortableHeader
                  label={field.charAt(0).toUpperCase() + field.slice(1)}
                  field={field}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={onSortChange ? handleSort : undefined}
                />
              </TableHead>
            ))}
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="h-32 text-center text-muted-foreground"
              >
                No items found
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id as number}>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {item.id as number}
                </TableCell>
                {displayFields.map((field) => (
                  <TableCell key={field}>
                    {formatValue(item[field], fields[field])}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => onEdit(item.id as number)}
                    >
                      <PencilEdit01Icon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => onDelete(item.id as number)}
                    >
                      <Delete01Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {meta.total > 0
              ? `Showing ${(meta.page - 1) * meta.perPage + 1} to ${Math.min(meta.page * meta.perPage, meta.total)} of ${meta.total} items`
              : `${meta.total} items`}
          </div>
          {onPerPageChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Per page:</label>
              <select
                value={meta.perPage}
                onChange={(e) => onPerPageChange(Number(e.target.value))}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {meta.totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
            >
              <ArrowLeft01Icon className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
            >
              Next
              <ArrowRight01Icon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: string;
  sortField: string;
  sortDir: string;
  onSort?: (field: string) => void;
}) {
  if (!onSort) {
    return <span>{label}</span>;
  }

  const isActive = sortField === field;

  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        sortDir === "asc" ? (
          <ArrowUp01Icon className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown01Icon className="h-3.5 w-3.5" />
        )
      ) : (
        <span className="w-3.5" />
      )}
    </button>
  );
}
