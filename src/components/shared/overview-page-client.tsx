"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardErrorState, DashboardPageSkeleton } from "@/components/shared/dashboard-state";
import { MessagesTable } from "@/components/shared/messages-table";
import { OverviewStats } from "@/components/shared/overview-stats";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function OverviewPageClient() {
  const { data, loading, error, refresh } = useDashboardData();

  if (loading && !data) {
    return <DashboardPageSkeleton />;
  }

  if (error && !data) {
    return <DashboardErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!data) {
    return <DashboardErrorState message="No data returned from API." onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gateway Overview"
        description="Monitor connected Baileys clients and delivery throughput."
        action={
          <Button asChild variant="outline">
            <Link href="/getting-started">Getting Started</Link>
          </Button>
        }
      />
      <OverviewStats overview={data.overview} />
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recent Messages</h3>
        <MessagesTable messages={data.recentMessages} connections={data.connections} />
      </section>
    </div>
  );
}
