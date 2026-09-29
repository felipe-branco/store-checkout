"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from "@em-slices/ui";

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
          if (!res.ok) setError(data.details ?? "Serviço indisponível");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao verificar saúde");
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
          EM Slices Starter
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Template de aplicação com event sourcing, vertical slices e Next.js. Adicione seu
          primeiro slice seguindo o guia em docs/TEMPLATE.md no repositório.
        </Typography>
      </Box>

      <Card>
        <CardContent className="ui-stack-col ui-gap-2">
          <Typography variant="h6">Status do sistema</Typography>
          {loading && (
            <Box className="ui-flex-align-center">
              <CircularProgress size={20} />
              <Typography variant="body2">Verificando /api/health…</Typography>
            </Box>
          )}
          {!loading && health?.status === "healthy" && (
            <Alert severity="success">Event store e message bus operacionais.</Alert>
          )}
          {!loading && health?.status !== "healthy" && (
            <Alert severity="warning">
              {error ?? "Serviço indisponível. Confira DATABASE_URL e docker compose."}
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
