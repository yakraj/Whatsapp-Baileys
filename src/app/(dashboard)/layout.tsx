import { Suspense } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { DashboardPageSkeleton } from "@/components/shared/dashboard-state";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
