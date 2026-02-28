"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiClient } from "@/lib/api-client";
import { sendMessageFormSchema, type SendMessageFormValues } from "@/lib/validation";
import type { GatewayConnection, MessageLog } from "@/types/gateway";

interface SendMessageFormProps {
  connections: GatewayConnection[];
  onSent: () => Promise<void>;
}

export function SendMessageForm({ connections, onSent }: SendMessageFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const form = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageFormSchema),
    defaultValues: {
      connectionId: "",
      mobileNumber: "",
      message: "",
      fileUrl: "",
      file: undefined,
    },
  });
  const connectedConnections = connections.filter(
    (connection) => connection.status === "connected"
  );

  const onSubmit = async (values: SendMessageFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    const formData = new FormData();
    formData.append("connectionId", values.connectionId);
    formData.append("mobileNumber", values.mobileNumber);
    formData.append("message", values.message);

    if (values.fileUrl) {
      formData.append("fileUrl", values.fileUrl);
    }

    if (values.file) {
      formData.append("file", values.file);
    }

    try {
      await apiClient.post<{ data: MessageLog }>("/api/v1/messages/send", formData);
      setSubmitSuccess("Message queued.");
      form.reset({
        connectionId: values.connectionId,
        mobileNumber: "",
        message: "",
        fileUrl: "",
        file: undefined,
      });
      await onSent();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Failed to queue message");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send Automated Message</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="connectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a connected client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connectedConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {connectedConnections.length > 0
                      ? "Only QR-approved tenants can send messages."
                      : "No active connections. Approve a QR first."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+14155552671" {...field} />
                  </FormControl>
                  <FormDescription>Use E.164 format for reliable routing.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-28" placeholder="Hello from gateway..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachment URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://cdn.example.com/invoice.pdf" {...field} />
                  </FormControl>
                  <FormDescription>Optional when uploading a local file.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachment File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.files?.[0])}
                    />
                  </FormControl>
                  <FormDescription>Optional, max 10MB for this starter.</FormDescription>
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
              disabled={form.formState.isSubmitting || connectedConnections.length === 0}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Queue Message
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
