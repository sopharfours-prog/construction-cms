import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Draws attention when the number needs someone to act (new requests). */
  emphasis?: boolean;
};

export function StatCard({ label, value, hint, icon: Icon, emphasis }: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-0", emphasis && "border-l-4 border-l-highlight")}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl type-display tabular-nums">{value}</p>
          {hint ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
