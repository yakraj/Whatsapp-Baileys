import { AlertTriangle, Link2, MessageCircleMore, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GatewayOverview } from "@/types/gateway";

interface OverviewStatsProps {
  overview: GatewayOverview;
}

export function OverviewStats({ overview }: OverviewStatsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
          <Link2 className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.connectedNow}</div>
          <p className="text-xs text-muted-foreground">
            {overview.totalConnections} total registered
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          <Send className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.totalMessagesSent}</div>
          <p className="text-xs text-muted-foreground">
            {overview.messagesToday} sent today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed Sends</CardTitle>
          <AlertTriangle className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.failedMessages}</div>
          <p className="text-xs text-muted-foreground">Monitor webhook retries</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gateway Activity</CardTitle>
          <MessageCircleMore className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.messagesToday + overview.connectedNow}
          </div>
          <p className="text-xs text-muted-foreground">Real-time index</p>
        </CardContent>
      </Card>
    </section>
  );
}
