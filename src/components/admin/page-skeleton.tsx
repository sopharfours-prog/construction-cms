import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for admin page content. Pages check permissions first
 * and wrap only their data in <Suspense>, so a missing permission still gets
 * a real HTTP redirect instead of a streamed one.
 */
export function AdminContentSkeleton({ variant = "table" }: { variant?: "table" | "dashboard" }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {variant === "dashboard" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <Skeleton className="h-20" />
      )}
      <Skeleton className="mt-6 h-72" />
    </div>
  );
}
