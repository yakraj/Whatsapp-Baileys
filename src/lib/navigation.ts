import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, LayoutDashboard, Link2, Send } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const dashboardNavItems: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/connections",
    label: "Connections",
    icon: Link2,
  },
  {
    href: "/messages",
    label: "Messages",
    icon: Send,
  },
  {
    href: "/getting-started",
    label: "Getting Started",
    icon: BookOpenCheck,
  },
];
