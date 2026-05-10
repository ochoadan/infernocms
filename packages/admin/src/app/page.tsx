"use client";

import { useSchema } from "@/components/providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { File02Icon, Database02Icon } from "@/lib/icons";
import Link from "next/link";

export default function DashboardPage() {
  const { schema } = useSchema();

  const collections = schema ? Object.entries(schema.collections) : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome to InfernoCMS. Manage your content below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map(([name, collection]) => (
          <Link key={name} href={`/collections/${name}`}>
            <Card className="transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <File02Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    {Object.keys(collection.fields).length} fields
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Fields: {Object.keys(collection.fields).join(", ")}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {collections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Database02Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">No collections found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Define collections in your content.config.ts file
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
