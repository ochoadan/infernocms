"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSchema } from "@/components/providers";
import { DynamicForm } from "@/components/dynamic-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchItem, updateItem } from "@/lib/api";
import { ArrowLeft01Icon, Loading01Icon, Copy01Icon } from "@hugeicons/react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const { schema } = useSchema();
  const collectionName = params.collection as string;
  const itemId = params.id as string;

  const { toast } = useToast();
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
      toast({ title: "Item updated", variant: "success" });
      router.push(`/collections/${collectionName}`);
    } catch (err) {
      console.error("Failed to update:", err);
      toast({ title: "Failed to update item", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = () => {
    if (!item) return;
    const { id, createdAt, updatedAt, slug, ...rest } = item;
    const params = new URLSearchParams({ data: JSON.stringify(rest) });
    router.push(`/collections/${collectionName}/new?${params}`);
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
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/collections/${collectionName}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft01Icon className="mr-2 h-4 w-4" />
            Back to {title}
          </Button>
        </Link>
        {item && (
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy01Icon className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
        )}
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
