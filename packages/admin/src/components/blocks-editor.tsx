"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Add01Icon,
  Delete01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@/lib/icons";
import type { SchemaBlock, SchemaField } from "@/lib/api";
import { FieldInput } from "@/components/field-input";

interface Block {
  type: string;
  id: string;
  [key: string]: unknown;
}

function generateBlockId(): string {
  return "block_" + Math.random().toString(36).substring(2, 10);
}

function SchemaBlockFields({
  block,
  schema,
  onUpdate,
  blockSchemas,
}: {
  block: Block;
  schema: SchemaBlock;
  onUpdate: (data: Partial<Block>) => void;
  blockSchemas?: Record<string, SchemaBlock>;
}) {
  return (
    <div className="space-y-3">
      {Object.entries(schema.fields).map(([fieldName, fieldConfig]) => (
        <FieldInput
          key={fieldName}
          name={fieldName}
          field={fieldConfig}
          value={block[fieldName]}
          onChange={(v) => onUpdate({ [fieldName]: v })}
          allValues={block as Record<string, unknown>}
          blockSchemas={blockSchemas}
        />
      ))}
    </div>
  );
}

function FallbackBlockFields({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (data: Partial<Block>) => void;
}) {
  const dataKeys = Object.keys(block).filter(
    (k) => k !== "type" && k !== "id"
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Unknown block type: <strong>{block.type}</strong>
      </p>
      {dataKeys.map((key) => (
        <div key={key}>
          <Label className="text-xs">{key}</Label>
          <Input
            value={
              typeof block[key] === "string"
                ? (block[key] as string)
                : JSON.stringify(block[key] ?? "")
            }
            onChange={(e) => onUpdate({ [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

interface BlocksEditorProps {
  value: unknown;
  onChange: (value: Block[]) => void;
  allowed?: string[];
  blockSchemas?: Record<string, SchemaBlock>;
}

export function BlocksEditor({
  value,
  onChange,
  allowed,
  blockSchemas,
}: BlocksEditorProps) {
  const blocks: Block[] = Array.isArray(value) ? (value as Block[]) : [];
  const [showPicker, setShowPicker] = useState(false);

  // Derive available types from blockSchemas if provided, otherwise use allowed list
  const availableTypes: { type: string; label: string }[] = (() => {
    if (blockSchemas && Object.keys(blockSchemas).length > 0) {
      const entries = Object.entries(blockSchemas);
      const filtered = allowed
        ? entries.filter(([key]) => allowed.includes(key))
        : entries;
      return filtered.map(([key]) => ({
        type: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));
    }
    // Fallback: use allowed list as plain types
    if (allowed) {
      return allowed.map((type) => ({
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
      }));
    }
    return [];
  })();

  const addBlock = (type: string) => {
    const newBlock: Block = { type, id: generateBlockId() };
    onChange([...blocks, newBlock]);
    setShowPicker(false);
  };

  const updateBlock = (index: number, data: Partial<Block>) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...data };
    onChange(updated);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const schema = blockSchemas?.[block.type];
        return (
          <Card key={block.id}>
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">
                {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp01Icon className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  <ArrowDown01Icon className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeBlock(index)}
                >
                  <Delete01Icon className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {schema ? (
                <SchemaBlockFields
                  block={block}
                  schema={schema}
                  onUpdate={(data) => updateBlock(index, data)}
                  blockSchemas={blockSchemas}
                />
              ) : (
                <FallbackBlockFields
                  block={block}
                  onUpdate={(data) => updateBlock(index, data)}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {showPicker ? (
        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
          {availableTypes.map(({ type, label }) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              className="h-auto py-3"
              onClick={() => addBlock(type)}
            >
              {label}
            </Button>
          ))}
          {availableTypes.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted-foreground">
              No block types available
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            className="col-span-2 text-xs"
            onClick={() => setShowPicker(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowPicker(true)}
        >
          <Add01Icon className="mr-2 h-4 w-4" />
          Add Block
        </Button>
      )}
    </div>
  );
}
