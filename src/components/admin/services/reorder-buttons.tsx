"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => Promise<ActionResult<unknown>>;
  labels: AdminMessages["common"];
  itemLabel: string;
};

export function ReorderButtons({ isFirst, isLast, onMove, labels, itemLabel }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const move = (direction: "up" | "down") =>
    start(async () => {
      const r = await onMove(direction);
      if (r.ok) {
        toast.success(labels.toast.reordered);
        router.refresh();
      } else toast.error(labels.errors[r.error]);
    });

  return (
    <div className="flex">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isFirst || pending}
        onClick={() => move("up")}
        aria-label={`${labels.moveUp}: ${itemLabel}`}
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isLast || pending}
        onClick={() => move("down")}
        aria-label={`${labels.moveDown}: ${itemLabel}`}
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
