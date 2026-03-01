"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname
          ? item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          : false;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted"
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
            {isActive ? <Badge className="ml-auto">Live</Badge> : null}
          </Link>
        );
      })}
    </nav>
  );
}
