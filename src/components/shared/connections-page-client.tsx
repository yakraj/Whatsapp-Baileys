"use client";

import { ConnectClientForm } from "@/components/shared/connect-client-form";
import { ConnectionsTable } from "@/components/shared/connections-table";
import { DashboardErrorState, DashboardPageSkeleton } from "@/components/shared/dashboard-state";
import { OverviewStats } from "@/components/shared/overview-stats";
import { PageHeader } from "@/components/shared/page-header";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function ConnectionsPageClient() {
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
        title="Client Connections"
        description="Create customer onboarding tokens and approve QR logins."
      />
      <OverviewStats overview={data.overview} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Connected Baileys Clients</h3>
          <ConnectionsTable
            connections={data.connections}
            onConnectionActivated={refresh}
          />
        </section>
        <ConnectClientForm onConnected={refresh} />
      </div>
    </div>
  );
}
