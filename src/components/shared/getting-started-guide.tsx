"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

interface GettingStartedGuideProps {
  content: string;
}

export function GettingStartedGuide({ content }: GettingStartedGuideProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documentation</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="flex gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Guide
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                pre: ({ node, ...props }) => (
                  <div className="overflow-auto rounded-lg bg-muted p-4 my-4">
                    <pre {...props} />
                  </div>
                ),
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                code: ({ node, ...props }) => (
                  <code
                    className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
