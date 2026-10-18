"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  labels: { toDark: string; toLight: string };
  className?: string;
  /** Show the label next to the icon (in menus) instead of only to screen readers. */
  showLabel?: boolean;
};

/**
 * Light/dark switch, on the public site and in the CMS. The choice is kept in
 * this browser for both; without one, the default from Website Settings
 * applies. Icons and labels are swapped with CSS, so the server's markup is
 * the same whatever the theme (no hydration mismatch, no flash).
 */
export function ThemeToggle({ labels, className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant={showLabel ? "outline" : "ghost"}
      size={showLabel ? "lg" : "icon"}
      className={cn(!showLabel && "size-9", className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" aria-hidden="true" />
      <MoonIcon className="dark:hidden" aria-hidden="true" />
      <span className={cn("dark:hidden", !showLabel && "sr-only")}>{labels.toDark}</span>
      <span className={cn("hidden dark:inline", !showLabel && "sr-only")}>{labels.toLight}</span>
    </Button>
  );
}
