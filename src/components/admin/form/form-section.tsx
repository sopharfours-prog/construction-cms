import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {/* A size container: fields lay out by the card's width, which in a
          side column stays narrow however wide the window is. */}
      <CardContent className="@container grid gap-5">{children}</CardContent>
    </Card>
  );
}

/** Sticky save bar at the bottom of long forms. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}
