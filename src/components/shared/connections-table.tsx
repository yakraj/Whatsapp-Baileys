"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiClientError, apiClient } from "@/lib/api-client";
import type { GatewayConnection } from "@/types/gateway";

interface ConnectionsTableProps {
  connections: GatewayConnection[];
  onConnectionActivated: () => Promise<void>;
}

export function ConnectionsTable({
  connections,
  onConnectionActivated,
}: ConnectionsTableProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const activateByConnectionId = async (connectionId: string) => {
    setActionError(null);
    setActivatingId(connectionId);

    try {
      await apiClient.post("/api/v1/connections/activate", { connectionId });
      await onConnectionActivated();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setActionError(error.message);
      } else {
        setActionError("Failed to activate connection");
      }
    } finally {
      setActivatingId(null);
    }
  };

  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No Baileys clients connected yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent Count</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell className="font-mono text-xs">{connection.customerId}</TableCell>
                <TableCell className="font-medium">{connection.customerName}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {connection.websiteUrl ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      connection.status === "connected" ? "default" : "secondary"
                    }
                  >
                    {connection.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{connection.sentCount}</TableCell>
                <TableCell className="text-right">
                  {connection.status !== "connected" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={activatingId === connection.id}
                      onClick={() => void activateByConnectionId(connection.id)}
                    >
                      {activatingId === connection.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Approve QR
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
