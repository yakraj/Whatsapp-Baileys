"use client";

import { DashboardErrorState, DashboardPageSkeleton } from "@/components/shared/dashboard-state";
import { MessagesTable } from "@/components/shared/messages-table";
import { OverviewStats } from "@/components/shared/overview-stats";
import { PageHeader } from "@/components/shared/page-header";
import { SendMessageForm } from "@/components/shared/send-message-form";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export function MessagesPageClient() {
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
        title="Message Queue"
        description="Send automated WhatsApp messages with optional file attachments."
      />
      <OverviewStats overview={data.overview} />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <SendMessageForm connections={data.connections} onSent={refresh} />
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Message Events</h3>
          <MessagesTable messages={data.recentMessages} connections={data.connections} />
        </section>
      </div>
    </div>
  );
}
