"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PencilEdit01Icon,
  Delete01Icon,
} from "@hugeicons/react";
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
  onPageChange: (page: number) => void;
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

export function DataTable({
  data,
  fields,
  meta,
  onPageChange,
  onEdit,
  onDelete,
}: DataTableProps) {
  const fieldNames = Object.keys(fields);
  const displayFields = fieldNames.slice(0, 4);
  const colCount = displayFields.length + 2;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            {displayFields.map((field) => (
              <TableHead key={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
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

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.perPage + 1} to{" "}
            {Math.min(meta.page * meta.perPage, meta.total)} of {meta.total} items
          </div>
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
        </div>
      )}
    </div>
  );
}
