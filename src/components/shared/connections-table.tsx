"use client";

import { CheckCircle2, Loader2, LogOut, Radio } from "lucide-react";
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
import type {
  ConnectionStatusCheckResult,
  GatewayConnection,
} from "@/types/gateway";

interface ConnectionsTableProps {
  connections: GatewayConnection[];
  onConnectionChanged: () => Promise<void>;
}

export function ConnectionsTable({
  connections,
  onConnectionChanged,
}: ConnectionsTableProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);

  const activateByConnectionId = async (connectionId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setActivatingId(connectionId);

    try {
      await apiClient.post("/api/v1/connections/activate", { connectionId });
      setActionSuccess("Connection activated.");
      await onConnectionChanged();
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

  const checkSocketStatus = async (connectionId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setCheckingId(connectionId);

    try {
      const result = await apiClient.get<{ data: ConnectionStatusCheckResult }>(
        `/api/v1/connections/status?connectionId=${encodeURIComponent(connectionId)}`,
      );
      const { connection, socketStatus } = result.data;
      const mobileInfo =
        socketStatus === "connected" && connection.connectedMobile
          ? ` — ${connection.connectedMobile}`
          : "";
      setActionSuccess(
        `Socket status for ${connection.customerName}: ${socketStatus}${mobileInfo}`,
      );
      await onConnectionChanged();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setActionError(error.message);
      } else {
        setActionError("Failed to check socket status");
      }
    } finally {
      setCheckingId(null);
    }
  };

  const logoutByConnectionId = async (connectionId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setLoggingOutId(connectionId);

    try {
      await apiClient.post("/api/v1/connections/logout", { connectionId });
      setActionSuccess("Connection logged out.");
      await onConnectionChanged();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setActionError(error.message);
      } else {
        setActionError("Failed to logout connection");
      }
    } finally {
      setLoggingOutId(null);
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
      {actionSuccess ? (
        <p className="rounded-md border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {actionSuccess}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {/* <TableHead>Customer ID</TableHead> */}
              <TableHead>Name</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent Count</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((connection) => (
              <TableRow key={connection.id}>
                {/* <TableCell className="font-mono text-xs">
                  {connection.customerId}
                </TableCell> */}
                <TableCell className="font-medium">
                  {connection.customerName}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {connection.websiteUrl ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {connection.status === "connected" &&
                  connection.connectedMobile ? (
                    connection.connectedMobile
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      connection.status === "connected"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {connection.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {connection.sentCount}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={checkingId === connection.id}
                      onClick={() => void checkSocketStatus(connection.id)}
                    >
                      {checkingId === connection.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Radio className="size-4" />
                      )}
                      Check Socket
                    </Button>
                    {connection.status !== "connected" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={activatingId === connection.id}
                        onClick={() =>
                          void activateByConnectionId(connection.id)
                        }
                      >
                        {activatingId === connection.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Approve QR
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={loggingOutId === connection.id}
                        onClick={() => void logoutByConnectionId(connection.id)}
                      >
                        {loggingOutId === connection.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <LogOut className="size-4" />
                        )}
                        Logout
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
