export type ConnectionStatus = "pending_qr" | "connected" | "stale";
export type MessageStatus = "queued" | "sent" | "failed";

export interface GatewayConnection {
  id: string;
  customerId: string;
  customerName: string;
  websiteUrl?: string;
  status: ConnectionStatus;
  sentCount: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface MessageAttachment {
  name: string;
  type?: string;
  size?: number;
  url?: string;
}

export interface MessageLog {
  id: string;
  connectionId: string;
  mobileNumber: string;
  message: string;
  attachment?: MessageAttachment;
  status: MessageStatus;
  createdAt: string;
}

export interface GatewayOverview {
  totalConnections: number;
  connectedNow: number;
  totalMessagesSent: number;
  messagesToday: number;
  failedMessages: number;
}

export interface DashboardOverviewResponse {
  overview: GatewayOverview;
  connections: GatewayConnection[];
  recentMessages: MessageLog[];
}

export interface CreateConnectionInput {
  customerId: string;
  customerName: string;
  websiteUrl?: string;
}

export interface ConnectionAuthBundle {
  connectionToken: string;
  qrCodeDataUrl: string;
  expiresAt: string;
}

export interface ConnectionRequestResult {
  connection: GatewayConnection;
  auth: ConnectionAuthBundle;
}

export interface SendMessageInput {
  mobileNumber: string;
  message: string;
  attachment?: MessageAttachment;
}
