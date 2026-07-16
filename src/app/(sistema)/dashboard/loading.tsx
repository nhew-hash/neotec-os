import { Skeleton } from "@/components/ui/skeleton";
import { CardsGridSkeleton } from "@/components/ui/table-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <CardsGridSkeleton colunas={6} />
      <CardsGridSkeleton colunas={3} />
      <CardsGridSkeleton colunas={3} />
    </div>
  );
}
