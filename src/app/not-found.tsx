import Link from "next/link";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";

/**
 * Root 404. Locale-aware versions arrive with localized routing (Phase 8);
 * until then this shows Lao with English beneath it.
 */
export default function NotFound() {
  const lo = getMessages("lo");
  const en = getMessages("en");

  return (
    <StatusScreen
      code="404"
      title={
        <>
          {lo.errors.notFoundTitle}
          <span lang="en" className="mt-1 block text-lg font-normal text-muted-foreground">
            {en.errors.notFoundTitle}
          </span>
        </>
      }
      description={
        <>
          <p>{lo.errors.notFoundDescription}</p>
          <p lang="en">{en.errors.notFoundDescription}</p>
        </>
      }
      actions={
        <Button asChild>
          <Link href="/">
            {lo.common.backHome} / <span lang="en">{en.common.backHome}</span>
          </Link>
        </Button>
      }
    />
  );
}
