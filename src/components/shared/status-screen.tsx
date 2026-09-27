import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusScreenProps = {
  code: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Shared layout for 401/403/404/500 screens. Shows safe copy only, never internals. */
export function StatusScreen({ code, title, description, actions, className }: StatusScreenProps) {
  return (
    <main
      className={cn("container-site flex min-h-dvh flex-col justify-center py-16", className)}
      aria-labelledby="status-title"
    >
      <div className="max-w-xl border-l-4 border-highlight pl-6 md:pl-8">
        <p className="text-7xl type-display text-concrete-300 md:text-8xl" aria-hidden="true">
          {code}
        </p>
        <h1 id="status-title" className="mt-6 text-2xl type-heading md:text-3xl">
          {title}
        </h1>
        <div className="mt-3 text-muted-foreground">{description}</div>
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </main>
  );
}
