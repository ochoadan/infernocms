"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { SchemaField, SchemaBlock } from "@/lib/api";
import { FloppyDiskIcon, Loading01Icon } from "@hugeicons/react";
import { FieldInput } from "@/components/field-input";

interface DynamicFormProps {
  fields: Record<string, SchemaField>;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  blockSchemas?: Record<string, SchemaBlock>;
}

export function DynamicForm({
  fields,
  initialData,
  onSubmit,
  isLoading,
  blockSchemas,
}: DynamicFormProps) {
  const { handleSubmit, watch, setValue, setError, formState } = useForm({
    defaultValues: initialData ?? {},
  });

  const values = watch();

  const onFormSubmit = handleSubmit(async (data) => {
    let hasErrors = false;
    for (const [name, field] of Object.entries(fields)) {
      if (field.required) {
        const value = data[name];
        if (value === undefined || value === null || value === '') {
          setError(name, { type: 'required', message: `${name.charAt(0).toUpperCase() + name.slice(1)} is required` });
          hasErrors = true;
        }
      }
    }
    if (hasErrors) return;

    const { id, createdAt, updatedAt, ...submitData } = data;
    await onSubmit(submitData);
  });

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      {Object.entries(fields).map(([name, field]) => (
        <FieldInput
          key={name}
          name={name}
          field={field}
          value={values[name]}
          onChange={(value) => setValue(name, value)}
          allValues={values}
          error={formState.errors[name]?.message as string | undefined}
          blockSchemas={blockSchemas}
        />
      ))}

      <div className="flex justify-end gap-4 pt-6">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loading01Icon className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FloppyDiskIcon className="mr-2 h-5 w-5" />
              Save
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
