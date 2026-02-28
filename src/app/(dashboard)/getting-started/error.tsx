"use client";

import { DashboardErrorState } from "@/components/shared/dashboard-state";

export default function GettingStartedError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <DashboardErrorState
      message={error.message || "Failed to render getting started route."}
      onRetry={reset}
    />
  );
}
