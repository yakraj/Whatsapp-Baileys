"use client";

import { BookOpenCheck, LogOut, Menu, RadioTower } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { dashboardNavItems } from "@/lib/navigation";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const pageTitle = useMemo(() => {
    if (!pathname) return "Dashboard";
    const item = dashboardNavItems.find((navItem) =>
      navItem.href === "/"
        ? pathname === "/"
        : pathname.startsWith(navItem.href),
    );

    return item?.label ?? "Dashboard";
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 border-r bg-card/60 backdrop-blur lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <div className="mb-6 flex items-center gap-3 rounded-xl border bg-background/80 px-3 py-3">
              <span className="rounded-md bg-primary/10 p-2 text-primary">
                <RadioTower className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Baileys Gateway</p>
                <p className="text-xs text-muted-foreground">
                  Multi-tenant control panel
                </p>
              </div>
            </div>
            <SidebarNav items={dashboardNavItems} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 md:px-6">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="size-4" />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle className="flex items-center gap-2">
                      <RadioTower className="size-4 text-primary" />
                      Baileys Gateway
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
                    <SidebarNav
                      items={dashboardNavItems}
                      onNavigate={() => setOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <h1 className="truncate text-base font-semibold md:text-lg">
                  {pageTitle}
                </h1>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/getting-started">
                  <BookOpenCheck className="size-4" />
                  Getting Started
                </Link>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
              >
                <LogOut className="size-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
      <Separator />
    </div>
  );
}
