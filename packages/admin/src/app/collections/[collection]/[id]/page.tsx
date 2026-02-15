"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSchema } from "@/components/providers";
import { DynamicForm } from "@/components/dynamic-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchItem, updateItem } from "@/lib/api";
import { ArrowLeft01Icon, Loading01Icon } from "@hugeicons/react";
import Link from "next/link";

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const { schema } = useSchema();
  const collectionName = params.collection as string;
  const itemId = params.id as string;

  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const collection = schema?.collections[collectionName];

  const loadItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchItem(collectionName, itemId);
      setItem(result.data);
    } catch (err) {
      console.error("Failed to fetch item:", err);
      setError(err instanceof Error ? err.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collection) {
      loadItem();
    }
  }, [collectionName, itemId, collection]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      await updateItem(collectionName, itemId, data);
      router.push(`/collections/${collectionName}`);
    } catch (err) {
      console.error("Failed to update:", err);
      alert("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!collection) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Collection not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/collections/${collectionName}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft01Icon className="mr-2 h-4 w-4" />
            Back to {title}
          </Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Edit {title} #{itemId}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loading01Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-16 text-center text-destructive">{error}</p>
          ) : item ? (
            <DynamicForm
              fields={collection.fields}
              initialData={item}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              blockSchemas={schema?.blocks}
            />
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Item not found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
