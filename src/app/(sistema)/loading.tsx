import { Skeleton } from "@/components/ui/skeleton";

/** Resposta imediata ao trocar de tela (antes ficava parado até o servidor responder). */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Carregando">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
