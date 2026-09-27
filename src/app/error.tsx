"use client";

import { useEffect } from "react";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";

/**
 * Route-level error boundary. In production Next.js strips the message and
 * stack from server errors and only passes an opaque `digest`, which is the
 * only detail shown to users (for support lookups in server logs).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lo = getMessages("lo");
  const en = getMessages("en");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      title={
        <>
          {lo.errors.serverTitle}
          <span lang="en" className="mt-1 block text-lg font-normal text-muted-foreground">
            {en.errors.serverTitle}
          </span>
        </>
      }
      description={
        <>
          <p>{lo.errors.serverDescription}</p>
          <p lang="en">{en.errors.serverDescription}</p>
          {error.digest ? (
            <p className="mt-4 text-sm">
              {lo.errors.referenceLabel} / <span lang="en">{en.errors.referenceLabel}</span>:{" "}
              <code className="rounded-sm bg-muted px-1.5 py-0.5">{error.digest}</code>
            </p>
          ) : null}
        </>
      }
      actions={
        <Button onClick={reset}>
          {lo.common.tryAgain} / <span lang="en">{en.common.tryAgain}</span>
        </Button>
      }
    />
  );
}
