"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchemaField, SchemaBlock } from "@/lib/api";
import { fetchCollection, uploadFile } from "@/lib/api";
import {
  Cancel01Icon,
  Upload04Icon,
  Image01Icon,
  File01Icon,
  Loading01Icon,
  Add01Icon,
  Delete01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/react";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/richtext-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] rounded-md border p-4 text-sm text-muted-foreground">
        Loading editor...
      </div>
    ),
  }
);
const BlocksEditor = dynamic(
  () => import("@/components/blocks-editor").then((m) => m.BlocksEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[100px] rounded-md border p-4 text-sm text-muted-foreground">
        Loading editor...
      </div>
    ),
  }
);

export function formatLocalDatetime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatLocalDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slugifyPreview(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDisplayName(item: Record<string, unknown>): string {
  for (const key of ["name", "title", "label", "username", "email"]) {
    if (item[key] && typeof item[key] === "string") {
      return item[key] as string;
    }
  }
  for (const value of Object.values(item)) {
    if (typeof value === "string" && value.length > 0 && value.length < 100) {
      return value;
    }
  }
  return `#${item.id}`;
}

function useRelationSearch(collection?: string) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback((query?: string) => {
    if (!collection) return;
    setLoading(true);
    fetchCollection(collection, { perPage: 50, search: query || undefined })
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collection]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => load(query), 300);
  }, [load]);

  return { items, loading, searchQuery, search };
}

function RelationSingleField({
  name,
  field,
  value,
  onChange,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const { items, loading, searchQuery, search } = useRelationSearch(field.collection);
  const [open, setOpen] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  const selectedItem = items.find((i) => i.id === value);
  const selectedLabel = selectedItem ? getDisplayName(selectedItem) : value != null ? `#${value}` : null;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={() => setOpen(!open)}
        >
          <span className={selectedLabel ? "" : "text-muted-foreground"}>
            {selectedLabel ?? (loading ? "Loading..." : `Select ${name}`)}
          </span>
          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => search(e.target.value)}
                className="h-8"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {value != null && (
                <button
                  type="button"
                  className="w-full rounded px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                  onClick={() => { onChange(null); setOpen(false); }}
                >
                  Clear selection
                </button>
              )}
              {items.map((item) => (
                <button
                  key={item.id as number}
                  type="button"
                  className={`w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent ${item.id === value ? "bg-accent font-medium" : ""}`}
                  onClick={() => { onChange(item.id); setOpen(false); }}
                >
                  {getDisplayName(item)}
                </button>
              ))}
              {items.length === 0 && !loading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
              )}
              {loading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function RelationManyField({
  name,
  field,
  value,
  onChange,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const { items, loading, searchQuery, search } = useRelationSearch(field.collection);
  const [open, setOpen] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  const selectedIds: number[] = Array.isArray(value)
    ? value.map((v) =>
        typeof v === "object" && v !== null
          ? ((v as Record<string, unknown>).id as number)
          : Number(v)
      )
    : [];

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const available = items.filter((item) => !selectedIds.includes(item.id as number));

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const item = items.find((i) => i.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
              >
                {item ? getDisplayName(item) : `#${id}`}
                <button
                  type="button"
                  onClick={() => toggleItem(id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <Cancel01Icon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={() => setOpen(!open)}
        >
          <span className="text-muted-foreground">
            {loading ? "Loading..." : `Add ${name}`}
          </span>
          <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => search(e.target.value)}
                className="h-8"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {available.map((item) => (
                <button
                  key={item.id as number}
                  type="button"
                  className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => toggleItem(item.id as number)}
                >
                  {getDisplayName(item)}
                </button>
              ))}
              {available.length === 0 && !loading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
              )}
              {loading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SlugField({
  name,
  field,
  value,
  onChange,
  allValues,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  allValues: Record<string, unknown>;
  error?: string;
}) {
  const [autoGenerate, setAutoGenerate] = useState(!value);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  const sourceField = field.from;
  const sourceValue = sourceField ? allValues[sourceField] : null;

  useEffect(() => {
    if (autoGenerate && sourceValue && typeof sourceValue === "string") {
      onChange(slugifyPreview(sourceValue));
    }
  }, [autoGenerate, sourceValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>
          {label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        {sourceField && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={autoGenerate}
              onCheckedChange={setAutoGenerate}
              className="scale-75"
            />
            Auto-generate
          </label>
        )}
      </div>
      <Input
        id={name}
        value={(value as string) ?? ""}
        onChange={(e) => {
          setAutoGenerate(false);
          onChange(e.target.value);
        }}
        disabled={autoGenerate}
        placeholder={`Enter ${name}`}
        className="h-11 font-mono text-sm"
      />
      {typeof value === "string" && value && (
        <p className="text-xs text-muted-foreground">/{value}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ImageField({
  name,
  field,
  value,
  onChange,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await uploadFile(file);
      onChange(result.data.url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {typeof value === "string" && value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt={name}
            className="h-32 w-32 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow-sm"
          >
            <Cancel01Icon className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 text-sm text-muted-foreground hover:border-foreground hover:text-foreground">
          {uploading ? (
            <>
              <Loading01Icon className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Image01Icon className="h-4 w-4" />
              {value ? "Change image" : "Upload image"}
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function FileField({
  name,
  field,
  value,
  onChange,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await uploadFile(file);
      onChange(result.data.url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const filename =
    value && typeof value === "string" ? value.split("/").pop() : null;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {filename && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <File01Icon className="h-4 w-4 text-muted-foreground" />
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {filename}
          </a>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto rounded-full p-0.5 hover:bg-muted"
          >
            <Cancel01Icon className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 text-sm text-muted-foreground hover:border-foreground hover:text-foreground">
          {uploading ? (
            <>
              <Loading01Icon className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload04Icon className="h-4 w-4" />
              {value ? "Change file" : "Upload file"}
            </>
          )}
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function LinkField({
  name,
  field,
  value,
  onChange,
  error,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const linkValue =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { url: "", label: "", target: "_self" };

  const updateLink = (key: string, val: string) => {
    onChange({ ...linkValue, [key]: val });
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <Label className="text-xs">URL</Label>
          <Input
            value={(linkValue.url as string) ?? ""}
            onChange={(e) => updateLink("url", e.target.value)}
            placeholder="https://example.com"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Label (optional)</Label>
          <Input
            value={(linkValue.label as string) ?? ""}
            onChange={(e) => updateLink("label", e.target.value)}
            placeholder="Click here"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Target</Label>
          <Select
            value={(linkValue.target as string) ?? "_self"}
            onValueChange={(v) => updateLink("target", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_self">Same window (_self)</SelectItem>
              <SelectItem value="_blank">New window (_blank)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function GroupField({
  name,
  field,
  value,
  onChange,
  error,
  blockSchemas,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  blockSchemas?: Record<string, SchemaBlock>;
}) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const groupValue =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  if (!field.fields) {
    return <p className="text-sm text-muted-foreground">No fields defined for group</p>;
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="space-y-4 rounded-lg border p-4">
        {Object.entries(field.fields).map(([subName, subField]) => (
          <FieldInput
            key={subName}
            name={subName}
            field={subField}
            value={groupValue[subName]}
            onChange={(v) => onChange({ ...groupValue, [subName]: v })}
            allValues={groupValue}
            blockSchemas={blockSchemas}
          />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ArrayField({
  name,
  field,
  value,
  onChange,
  error,
  blockSchemas,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  blockSchemas?: Record<string, SchemaBlock>;
}) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];

  if (!field.fields) {
    return <p className="text-sm text-muted-foreground">No fields defined for array</p>;
  }

  const addItem = () => {
    onChange([...items, {}]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  const updateItem = (index: number, itemValue: Record<string, unknown>) => {
    const updated = [...items];
    updated[index] = itemValue;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Item {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp01Icon className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown01Icon className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Delete01Icon className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(field.fields!).map(([subName, subField]) => (
                <FieldInput
                  key={subName}
                  name={subName}
                  field={subField}
                  value={item[subName]}
                  onChange={(v) =>
                    updateItem(index, { ...item, [subName]: v })
                  }
                  allValues={item}
                  blockSchemas={blockSchemas}
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addItem}
        >
          <Add01Icon className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function FieldInput({
  name,
  field,
  value,
  onChange,
  allValues,
  error,
  blockSchemas,
}: {
  name: string;
  field: SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
  allValues: Record<string, unknown>;
  error?: string;
  blockSchemas?: Record<string, SchemaBlock>;
}) {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={name}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${name}`}
            maxLength={field.maxLength}
            className="h-11"
          />
          {field.maxLength && (
            <p className="text-xs text-muted-foreground">
              {((value as string) ?? "").length}/{field.maxLength}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={name}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${name}`}
            maxLength={field.maxLength}
            rows={5}
            className="min-h-[120px]"
          />
          {field.maxLength && (
            <p className="text-xs text-muted-foreground">
              {((value as string) ?? "").length}/{field.maxLength}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={name}
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : null)
            }
            placeholder={`Enter ${name}`}
            step={field.integer ? "1" : "any"}
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between rounded-xl border p-5">
          <div className="space-y-1">
            <Label htmlFor={name} className="text-base">
              {label}
            </Label>
            <p className="text-sm text-muted-foreground">
              Toggle this option on or off
            </p>
          </div>
          <Switch
            id={name}
            checked={(value as boolean) ?? false}
            onCheckedChange={onChange}
          />
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder={`Select ${name}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "datetime":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={name}
            type="datetime-local"
            value={value ? formatLocalDatetime(value as string) : ""}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "date":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={name}
            type="date"
            value={value ? formatLocalDate(value as string) : ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "json":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={name}
            value={value ? JSON.stringify(value, null, 2) : ""}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
                setJsonError(null);
              } catch {
                setJsonError("Invalid JSON");
              }
            }}
            placeholder="Enter JSON"
            rows={8}
            className={`min-h-[180px] font-mono text-sm ${jsonError ? "border-destructive" : ""}`}
          />
          {(error || jsonError) && (
            <p className="text-sm text-destructive">{error || jsonError}</p>
          )}
        </div>
      );

    case "relation":
      if (field.many) {
        return (
          <RelationManyField
            name={name}
            field={field}
            value={value}
            onChange={onChange}
            error={error}
          />
        );
      }
      return (
        <RelationSingleField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "slug":
      return (
        <SlugField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          allValues={allValues}
          error={error}
        />
      );

    case "image":
      return (
        <ImageField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "file":
      return (
        <FileField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "richtext":
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <RichTextEditor value={value} onChange={(v) => onChange(v)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "blocks":
      return (
        <div className="space-y-2">
          <Label>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <BlocksEditor
            value={value}
            onChange={(v) => onChange(v)}
            allowed={field.allowed}
            blockSchemas={blockSchemas}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case "link":
      return (
        <LinkField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "group":
      return (
        <GroupField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          blockSchemas={blockSchemas}
        />
      );

    case "array":
      return (
        <ArrayField
          name={name}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          blockSchemas={blockSchemas}
        />
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={name}>
            {label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={name}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${name}`}
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );
  }
}
