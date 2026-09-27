"use client";

import { getMessages } from "@/i18n/messages";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it cannot rely on the layout's fonts, providers or CSS.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lo = getMessages("lo");
  const en = getMessages("en");

  return (
    <html lang="lo">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#1f2328",
          background: "#ffffff",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "32rem", borderLeft: "4px solid #c99a2e", paddingLeft: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{lo.errors.serverTitle}</h1>
          <p lang="en" style={{ color: "#5b6067", margin: "0.25rem 0 1.5rem" }}>
            {en.errors.serverTitle}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#14325a",
              color: "#ffffff",
              border: 0,
              borderRadius: "4px",
              padding: "0.625rem 1rem",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            {lo.common.tryAgain} / {en.common.tryAgain}
          </button>
        </main>
      </body>
    </html>
  );
}
