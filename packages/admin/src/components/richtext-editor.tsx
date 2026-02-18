"use client";

import { useMemo } from "react";
import {
  createPlateEditor,
  Plate,
  PlateContent,
  ParagraphPlugin,
  type PlateEditor as PlateEditorType,
} from "platejs/react";
import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
} from "@platejs/basic-nodes/react";
import { ListPlugin } from "@platejs/list/react";

interface RichTextEditorProps {
  value: unknown;
  onChange: (value: unknown) => void;
}

const defaultValue = [{ type: "p", children: [{ text: "" }] }];

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [
          ParagraphPlugin,
          BasicBlocksPlugin,
          BasicMarksPlugin,
          ListPlugin,
        ],
        value:
          Array.isArray(value) && value.length > 0
            ? (value as any)
            : defaultValue,
      }),
    []
  );

  return (
    <Plate
      editor={editor}
      onChange={({ value: newValue }) => {
        onChange(newValue);
      }}
    >
      <PlateContent
        className="min-h-[200px] rounded-md border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1"
        placeholder="Start writing..."
      />
    </Plate>
  );
}
