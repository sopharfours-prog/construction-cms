"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";

/**
 * Error boundary for public pages. In production Next.js strips the message
 * and stack from server errors; only the opaque `digest` is shown, as a
 * reference for support to look up in the server logs.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const t = getMessages(params.locale && isLocale(params.locale) ? params.locale : defaultLocale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      title={t.errors.serverTitle}
      description={
        <>
          <p>{t.errors.serverDescription}</p>
          {error.digest ? (
            <p className="mt-4 text-sm">
              {t.errors.referenceLabel}:{" "}
              <code className="rounded-sm bg-muted px-1.5 py-0.5">{error.digest}</code>
            </p>
          ) : null}
        </>
      }
      actions={<Button onClick={reset}>{t.common.tryAgain}</Button>}
    />
  );
}
