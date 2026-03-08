import { Suspense } from "react";
import { Skeleton, DoctorCardSkeleton, StatsSkeleton } from "@/components/ui/Skeleton";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

/**
 * Dashboard Page — Server Component
 *
 * This is a React Server Component that streams the shell instantly,
 * then hydrates the interactive DashboardClient on the client.
 * Suspense boundary provides a skeleton while JS loads.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full h-full px-3 lg:px-6 flex flex-col overflow-hidden animate-pulse">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 mb-4 lg:mb-5 gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
      </header>
      <div className="space-y-6">
        <StatsSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <DoctorCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
