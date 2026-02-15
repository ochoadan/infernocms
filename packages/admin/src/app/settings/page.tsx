"use client";

import { useEffect, useState } from "react";
import { useSchema } from "@/components/providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@hugeicons/react";

export default function SettingsPage() {
  const { schema, error, refresh } = useSchema();
  const [adminKey, setAdminKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAdminKey(localStorage.getItem("infernocms-admin-key") ?? "");
    }
  }, []);

  const handleSaveKey = () => {
    if (typeof window !== "undefined") {
      if (adminKey) {
        localStorage.setItem("infernocms-admin-key", adminKey);
      } else {
        localStorage.removeItem("infernocms-admin-key");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your InfernoCMS configuration
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>API Connection</CardTitle>
            <CardDescription>
              Current connection to the InfernoCMS API server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
                  {error ? 'Disconnected' : 'Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">API URL</span>
                <code className="rounded-md bg-muted px-2 py-1 text-sm">/api (proxied)</code>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Collections</span>
                <span className="font-medium">{schema ? Object.keys(schema.collections).length : 0}</span>
              </div>
              <Button variant="outline" onClick={refresh} className="mt-2">
                <RefreshIcon className="mr-2 h-4 w-4" />
                Refresh Schema
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Key</CardTitle>
            <CardDescription>
              Set an admin key to bypass access control rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin secret key"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveKey}>
                  Save Key
                </Button>
                {saved && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Saved
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schema Overview</CardTitle>
            <CardDescription>
              Your content collections and their fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schema ? (
              <div className="space-y-4">
                {Object.entries(schema.collections).map(([name, collection]) => (
                  <div key={name} className="rounded-xl border p-5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </h4>
                    </div>
                    <div className="mt-3 space-y-2">
                      {Object.entries(collection.fields).map(([fieldName, field]) => (
                        <div key={fieldName} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{fieldName}</span>
                          <span className="flex items-center gap-2">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                required
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No schema loaded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
