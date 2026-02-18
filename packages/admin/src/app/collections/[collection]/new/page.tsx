"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSchema } from "@/components/providers";
import { DynamicForm } from "@/components/dynamic-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createItem } from "@/lib/api";
import { ArrowLeft01Icon } from "@hugeicons/react";
import Link from "next/link";

export default function NewItemPage() {
  const params = useParams();
  const router = useRouter();
  const { schema } = useSchema();
  const collectionName = params.collection as string;

  const [isLoading, setIsLoading] = useState(false);

  const collection = schema?.collections[collectionName];

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      await createItem(collectionName, data);
      router.push(`/collections/${collectionName}`);
    } catch (err) {
      console.error("Failed to create:", err);
      alert("Failed to create item");
    } finally {
      setIsLoading(false);
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
          <CardTitle>Create {title}</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicForm
            fields={collection.fields}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            blockSchemas={schema?.blocks}
          />
        </CardContent>
      </Card>
    </div>
  );
}
