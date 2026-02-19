"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginScreenProps {
  onLogin: () => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    localStorage.setItem("infernocms-admin-key", key);

    try {
      await onLogin();
    } catch {
      // If onLogin doesn't throw, the provider will re-render.
      // If it does throw, we catch it here.
    }

    // After refresh, if requiresAuth is still true the component
    // will re-render with the same state. We detect that by checking
    // if we're still mounted after a tick.
    setTimeout(() => {
      // If we're still visible, the key was wrong
      setError("Invalid admin key");
      setLoading(false);
    }, 500);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>InfernoCMS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the admin key to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-key">Admin Key</Label>
              <Input
                id="admin-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter admin key"
                required
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
