"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from "@store-checkout/ui";

type HealthStatus = {
  status: string;
  eventStore?: string;
  messageBus?: string;
  details?: string;
};

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as HealthStatus;
        if (!cancelled) {
          setHealth(data);
          if (!res.ok) setError(data.details ?? "Service unavailable");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to check health");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box className="ui-stack-col ui-max-w-720">
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Store Checkout
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Self-service checkout for a snack bar kiosk. Product spec and build notes live in{" "}
          <code>docs/project/</code>. Checkout slices will replace this health dashboard.
        </Typography>
      </Box>

      <Card>
        <CardContent className="ui-stack-col ui-gap-2">
          <Typography variant="h6">System status</Typography>
          {loading && (
            <Box className="ui-flex-align-center">
              <CircularProgress size={20} />
              <Typography variant="body2">Checking /api/health…</Typography>
            </Box>
          )}
          {!loading && health?.status === "healthy" && (
            <Alert severity="success">Event store and message bus are operational.</Alert>
          )}
          {!loading && health?.status !== "healthy" && (
            <Alert severity="warning">
              {error ?? "Service unavailable. Check DATABASE_URL and docker compose."}
            </Alert>
          )}
          {!loading && health && (
            <Typography variant="caption" color="text.secondary" component="pre">
              {JSON.stringify(health, null, 2)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
