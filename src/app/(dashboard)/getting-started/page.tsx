import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

const baseUrl = "https://manager.adonaisoft.com";

export default function GettingStartedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Getting Started"
        description="Set up a customer connection, approve QR login, and start automated messaging."
        action={
          <Button asChild>
            <Link href={baseUrl} target="_blank" rel="noreferrer">
              Open Manager
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Create Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Go to <span className="font-mono">{baseUrl}/connections</span>, create a
            connection with customer ID and name.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <pre className="overflow-x-auto">
              <code>{`POST ${baseUrl}/api/v1/connections/request
{
  "customerId": "adnonaisoft",
  "customerName": "Adnonai Soft",
  "websiteUrl": "https://adnonaisoft.com"
}`}</code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground">
            Response returns connection ID, JWT token, and QR code data URL.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Approve QR Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ask the customer to scan the QR code and approve login. Then click
            <span className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
              Mark QR Approved
            </span>
            in the dashboard.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <pre className="overflow-x-auto">
              <code>{`POST ${baseUrl}/api/v1/connections/activate
Authorization: Bearer <connectionToken>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 3: Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Once status is <Badge className="mx-1">connected</Badge>, start sending
            automated messages with optional attachments.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <pre className="overflow-x-auto">
              <code>{`POST ${baseUrl}/api/v1/messages/send
Authorization: Bearer <connectionToken>
{
  "mobileNumber": "+919999999999",
  "message": "Hello from gateway"
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
