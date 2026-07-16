import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Esqueleto genérico de tela com título + tabela — usado nos loading.tsx das listagens. */
export function PageWithTableSkeleton({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          {Array.from({ length: linhas }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Esqueleto de grade de cards — usado no Dashboard. */
export function CardsGridSkeleton({ colunas = 3 }: { colunas?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
      {Array.from({ length: colunas }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-card" />
      ))}
    </div>
  );
}
