import type { InquiryStatus, ProjectStatus, QuoteStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";

type Variant = "info" | "warning" | "success" | "secondary" | "destructive" | "highlight";

const projectVariant: Record<ProjectStatus, Variant> = {
  UPCOMING: "info",
  ONGOING: "warning",
  COMPLETED: "success",
};
const inquiryVariant: Record<InquiryStatus, Variant> = {
  NEW: "info",
  IN_PROGRESS: "warning",
  REPLIED: "success",
  CLOSED: "secondary",
};
const quoteVariant: Record<QuoteStatus, Variant> = {
  NEW: "info",
  REVIEWING: "warning",
  CONTACTED: "warning",
  QUOTED: "highlight",
  APPROVED: "success",
  REJECTED: "destructive",
  CLOSED: "secondary",
};

type Props =
  | { kind: "project"; status: ProjectStatus; label: string }
  | { kind: "inquiry"; status: InquiryStatus; label: string }
  | { kind: "quote"; status: QuoteStatus; label: string };

/** One colour language for every status in the CMS. */
export function StatusBadge(props: Props) {
  const variant =
    props.kind === "project"
      ? projectVariant[props.status]
      : props.kind === "inquiry"
        ? inquiryVariant[props.status]
        : quoteVariant[props.status];
  return <Badge variant={variant}>{props.label}</Badge>;
}
