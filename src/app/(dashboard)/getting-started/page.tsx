import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { GettingStartedGuide } from "@/components/shared/getting-started-guide";

const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3001";

export default async function GettingStartedPage() {
  const filePath = path.join(process.cwd(), "docs", "GETTING_STARTED.md");
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error("Failed to read getting started guide:", error);
    content = "Failed to load documentation.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Getting Started"
        description="Set up a customer connection, approve QR login, check socket status, and send automated messaging."
        action={
          <Button asChild>
            <Link href={baseUrl} target="_blank" rel="noreferrer">
              Open Manager
            </Link>
          </Button>
        }
      />
      <GettingStartedGuide content={content} />
    </div>
  );
}
