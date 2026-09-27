"use client";

import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarToggle({ label }: { label: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={label}
      className="-ml-1"
    >
      <PanelLeftIcon aria-hidden="true" />
    </Button>
  );
}
