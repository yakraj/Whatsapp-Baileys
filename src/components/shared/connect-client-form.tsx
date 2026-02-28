"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, Loader2, PlugZap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiClient } from "@/lib/api-client";
import {
  requestConnectionFormSchema,
  type RequestConnectionFormValues,
} from "@/lib/validation";
import type { ConnectionRequestResult } from "@/types/gateway";

interface ConnectClientFormProps {
  onConnected: () => Promise<void>;
}

interface IssuedCredentialsState {
  token: string;
  qrCodeDataUrl: string;
  expiresAt: string;
}

export function ConnectClientForm({ onConnected }: ConnectClientFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] =
    useState<IssuedCredentialsState | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);

  const form = useForm<RequestConnectionFormValues>({
    resolver: zodResolver(requestConnectionFormSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      websiteUrl: "",
    },
  });

  const onSubmit = async (values: RequestConnectionFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await apiClient.post<{ data: ConnectionRequestResult }>(
        "/api/v1/connections/request",
        {
          ...values,
          websiteUrl: values.websiteUrl || undefined,
        }
      );

      setIssuedCredentials({
        token: response.data.auth.connectionToken,
        qrCodeDataUrl: response.data.auth.qrCodeDataUrl,
        expiresAt: response.data.auth.expiresAt,
      });
      setSubmitSuccess("JWT issued and QR generated. Ask customer to scan and approve.");
      await onConnected();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Failed to create connection request");
      }
    }
  };

  const copyToken = async () => {
    if (!issuedCredentials) {
      return;
    }

    await navigator.clipboard.writeText(issuedCredentials.token);
    setSubmitSuccess("JWT copied.");
  };

  const activateConnection = async () => {
    if (!issuedCredentials) {
      return;
    }

    setActivationLoading(true);
    setSubmitError(null);

    try {
      await apiClient.post(
        "/api/v1/connections/activate",
        {},
        {
          headers: {
            Authorization: `Bearer ${issuedCredentials.token}`,
          },
        }
      );
      setSubmitSuccess("Connection activated. Message transactions are now allowed.");
      await onConnected();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Failed to activate connection");
      }
    } finally {
      setActivationLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create New Connection</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer ID</FormLabel>
                  <FormControl>
                    <Input placeholder="adnonaisoft" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique tenant key used for connection login.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Adnonai Soft" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://adnonaisoft.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional metadata for tenant management.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {submitSuccess}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlugZap className="size-4" />
              )}
              Issue JWT + QR
            </Button>
          </form>
        </Form>

        {issuedCredentials ? (
          <div className="mt-6 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">Issued Connection Credentials</p>
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(issuedCredentials.expiresAt).toLocaleString()}
              </p>
            </div>
            <div className="flex justify-center rounded-md border bg-background p-3">
              <Image
                src={issuedCredentials.qrCodeDataUrl}
                alt="Connection QR code"
                width={180}
                height={180}
                unoptimized
              />
            </div>
            <Textarea
              value={issuedCredentials.token}
              readOnly
              className="min-h-24 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void copyToken()}>
                <Copy className="size-4" />
                Copy JWT
              </Button>
              <Button
                type="button"
                onClick={() => void activateConnection()}
                disabled={activationLoading}
              >
                {activationLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark QR Approved
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
