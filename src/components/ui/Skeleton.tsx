import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200/60 dark:bg-slate-800/60",
        variant === 'circle' ? "rounded-full" : "rounded-md",
        className
      )}
    />
  );
}

export function DoctorCardSkeleton() {
    return (
        <div className="p-4 rounded-3xl border border-slate-100 bg-white/50 space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10" variant="circle" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="pt-2 flex justify-between">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 rounded-3xl border border-slate-100 bg-white shadow-sm space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    );
}
