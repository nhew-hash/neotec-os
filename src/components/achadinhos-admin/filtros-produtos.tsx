import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_INFO } from "@/lib/achadinhos/status";
import { STATUS_PRODUTO, type StatusProduto } from "@/lib/achadinhos/tipos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FiltrosProdutos({ status, busca }: { status?: StatusProduto; busca?: string }) {
  const href = (s?: string) => (s ? `/achadinhos-admin?status=${s}${busca ? `&q=${encodeURIComponent(busca)}` : ""}` : `/achadinhos-admin${busca ? `?q=${encodeURIComponent(busca)}` : ""}`);
  const chip = (ativo: boolean) => cn("rounded-full border px-3 py-1 text-sm transition-colors", ativo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground");
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Link href={href()} className={chip(!status)}>Todos</Link>
        {STATUS_PRODUTO.map((s) => (
          <Link key={s} href={href(s)} className={chip(status === s)}>{STATUS_INFO[s].label}</Link>
        ))}
      </div>
      <form action="/achadinhos-admin" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <Input name="q" defaultValue={busca} placeholder="Buscar por nome, categoria ou slug" className="w-full sm:w-72" aria-label="Buscar produtos" />
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
    </div>
  );
}
