"use client";

import { useEffect } from "react";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { getAdminMessages } from "@/i18n/admin";
import { isLocale } from "@/config/i18n";

/** Admin error boundary: keeps the sidebar and header, shows no internals. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => console.error(error), [error]);
  const lang =
    typeof document !== "undefined" ? document.querySelector("[lang]")?.getAttribute("lang") : null;
  const t = getAdminMessages(lang && isLocale(lang) ? lang : "lo").error;

  return (
    <StatusScreen
      code="500"
      className="min-h-0 px-0 py-8"
      title={t.title}
      description={
        <>
          <p>{t.description}</p>
          {error.digest ? (
            <p className="mt-3 text-sm">
              {t.reference}:{" "}
              <code className="rounded-sm bg-muted px-1.5 py-0.5">{error.digest}</code>
            </p>
          ) : null}
        </>
      }
      actions={<Button onClick={reset}>{t.retry}</Button>}
    />
  );
}
