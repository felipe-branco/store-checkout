'use client';

import { useState } from 'react';
import { Alert, Box } from '@store-checkout/ui';
import { StartScreen } from '@store-checkout/ui';

interface CreateCartProps {
  onSuccess?: () => void;
  apiEndpoint?: string;
}

export default function CreateCart({
  onSuccess,
  apiEndpoint = '/api/cart',
}: CreateCartProps = {}) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleStart() {
    if (loading) return;
    setSubmitError(null);
    setLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setSubmitError(data.error || 'Could not start your order. Try again.');
        return;
      }

      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="relative">
      {submitError ? (
        <Box className="absolute top-4 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4">
          <Alert severity="error">{submitError}</Alert>
        </Box>
      ) : null}
      <StartScreen onStart={() => void handleStart()} />
    </Box>
  );
}
