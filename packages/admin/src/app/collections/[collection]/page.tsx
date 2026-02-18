"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSchema } from "@/components/providers";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchCollection, deleteItem, type PaginatedResponse } from "@/lib/api";
import { Add01Icon, RefreshIcon } from "@hugeicons/react";

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const { schema } = useSchema();
  const collectionName = params.collection as string;

  const [data, setData] = useState<PaginatedResponse<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const collection = schema?.collections[collectionName];

  const loadData = async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchCollection(collectionName, {
        page: pageNum,
        perPage: 10,
        sort: "-createdAt",
        depth: 1,
      });
      setData(result);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collection) {
      loadData(1);
    }
  }, [collectionName, collection]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await deleteItem(collectionName, id);
      loadData(page);
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete item");
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/collections/${collectionName}/${id}`);
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
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your {collectionName} content
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => loadData(page)}>
            <RefreshIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push(`/collections/${collectionName}/new`)}>
            <Add01Icon className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadData(page)}>
                <RefreshIcon className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : data ? (
            <DataTable
              data={data.data}
              fields={collection.fields}
              meta={data.meta}
              onPageChange={loadData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">No data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
