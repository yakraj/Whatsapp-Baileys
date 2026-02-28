import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GatewayConnection, MessageLog } from "@/types/gateway";

interface MessagesTableProps {
  messages: MessageLog[];
  connections: GatewayConnection[];
}

function connectionNameForId(
  connectionId: string,
  connections: GatewayConnection[]
): string {
  return connections.find((connection) => connection.id === connectionId)?.customerName ?? "-";
}

export function MessagesTable({ messages, connections }: MessagesTableProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Message history will appear once your clients start sending jobs.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Attachment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => (
            <TableRow key={message.id}>
              <TableCell>{connectionNameForId(message.connectionId, connections)}</TableCell>
              <TableCell className="font-mono text-xs">{message.mobileNumber}</TableCell>
              <TableCell className="max-w-64 truncate">{message.message}</TableCell>
              <TableCell className="text-muted-foreground">
                {message.attachment?.name ?? "-"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    message.status === "sent"
                      ? "default"
                      : message.status === "queued"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {message.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
