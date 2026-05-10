"use client";

import { useEffect, useState } from "react";
import {
  listAuthTokens,
  createAuthToken,
  revokeAuthToken,
  type TokenSummary,
  type MintedToken,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write" | "admin">("write");
  const [minted, setMinted] = useState<MintedToken | null>(null);
  const { toast } = useToast();

  async function refresh() {
    try {
      setTokens(await listAuthTokens());
    } catch (e) {
      toast({ title: "Failed to load tokens", description: String(e), variant: "destructive" });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const m = await createAuthToken(name.trim(), scope);
      setMinted(m);
      setName("");
      void refresh();
    } catch (e) {
      toast({ title: "Failed to create token", description: String(e), variant: "destructive" });
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this token? This cannot be undone.")) return;
    try {
      await revokeAuthToken(id);
      void refresh();
    } catch (e) {
      toast({ title: "Failed to revoke", description: String(e), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API tokens</h1>
        <p className="mt-2 text-muted-foreground">
          Create tokens for content pipelines and other consumers. Tokens are shown once on
          creation and stored hashed thereafter.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create token</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-wrap gap-2">
            <Input
              placeholder="Token name (e.g. content-pipeline)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              className="rounded-md border bg-background px-3 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="read">read</option>
              <option value="write">write</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      {minted && (
        <Card className="border-amber-400">
          <CardHeader>
            <CardTitle>Save this token now — it won't be shown again</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block break-all rounded bg-muted p-3 font-mono text-sm">
              {minted.plaintext}
            </code>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(minted.plaintext);
                  toast({ title: "Copied" });
                }}
              >
                Copy
              </Button>
              <Button variant="outline" onClick={() => setMinted(null)}>
                I've saved it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active tokens ({tokens.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tokens.length === 0 && (
            <p className="text-sm text-muted-foreground">No active tokens.</p>
          )}
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b py-2 last:border-0"
            >
              <div>
                <div className="font-medium">
                  {t.name}{" "}
                  <span className="ml-2 text-xs uppercase opacity-60">{t.scope}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(t.created_at).toLocaleString()} · Last used{" "}
                  {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "never"}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => onRevoke(t.id)}>
                Revoke
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
