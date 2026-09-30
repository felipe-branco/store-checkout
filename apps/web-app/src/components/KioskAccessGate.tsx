"use client";

import { useState } from "react";

type KioskAccessGateProps = {
  onUnlocked: () => void;
};

export function KioskAccessGate({ onUnlocked }: KioskAccessGateProps) {
  const [magicWord, setMagicWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/kiosk/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magicWord }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error ?? "Access denied");
        return;
      }
      onUnlocked();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="font-display text-2xl font-bold text-foreground">Store access</h1>
        <p className="text-sm text-muted-foreground">
          Enter the access code to open self-checkout.
        </p>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Access code</span>
          <input
            type="password"
            autoComplete="off"
            value={magicWord}
            onChange={(e) => setMagicWord(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            disabled={submitting}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || magicWord.length === 0}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
