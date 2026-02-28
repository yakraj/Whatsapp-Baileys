"use client";

import { DashboardErrorState } from "@/components/shared/dashboard-state";

export default function DashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <DashboardErrorState
      message={error.message || "Failed to render dashboard route."}
      onRetry={reset}
    />
  );
}
