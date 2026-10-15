import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <Skeleton className="h-[340px] rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-card" />)}
        </div>
      </div>
    </div>
  );
}
