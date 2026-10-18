import {
  CircleUserIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HardHatIcon,
  ImagesIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  NewspaperIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldIcon,
  TagsIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import type { AdminNavIcon } from "@/config/admin-nav";

const icons: Record<AdminNavIcon, LucideIcon> = {
  "layout-dashboard": LayoutDashboardIcon,
  "hard-hat": HardHatIcon,
  wrench: WrenchIcon,
  newspaper: NewspaperIcon,
  images: ImagesIcon,
  "file-text": FileTextIcon,
  inbox: InboxIcon,
  "file-spreadsheet": FileSpreadsheetIcon,
  users: UsersIcon,
  "scroll-text": ScrollTextIcon,
  settings: SettingsIcon,
  tags: TagsIcon,
  shield: ShieldIcon,
  "circle-user": CircleUserIcon,
  "messages-square": MessagesSquareIcon,
};

export function NavIcon({ name, className }: { name: AdminNavIcon; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" />;
}
