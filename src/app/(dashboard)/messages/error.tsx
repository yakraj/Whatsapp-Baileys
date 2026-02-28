"use client";

import { DashboardErrorState } from "@/components/shared/dashboard-state";

export default function MessagesError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <DashboardErrorState
      message={error.message || "Failed to render messages route."}
      onRetry={reset}
    />
  );
}
