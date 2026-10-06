"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Pause, Play, Archive, Star, Trash2, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATUS_INFO } from "@/lib/achadinhos/status";
import { urlPublicaProduto } from "@/lib/achadinhos/apresentacao";
import type { ProdutoAchadinho } from "@/lib/achadinhos/tipos";
import { formatCurrency } from "@/utils/format";
import { alternarDestaqueAction, alterarOrdemAction, excluirProdutoAction, mudarStatusAction } from "@/services/achadinhos/achadinhos.actions";

export function ProdutosTabela({ produtos, podeExcluir, filtrando }: { produtos: ProdutoAchadinho[]; podeExcluir: boolean; filtrando: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<ProdutoAchadinho | null>(null);

  function rodar(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.success) setErro(r.error ?? "Não foi possível concluir");
      router.refresh();
    });
  }

  async function copiar(p: ProdutoAchadinho) {
    try {
      await navigator.clipboard.writeText(urlPublicaProduto(p.slug));
      setCopiado(p.id);
      setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 1800);
    } catch {
      setErro("Não deu pra copiar automaticamente. Abra o produto no site e copie o endereço.");
    }
  }

  if (produtos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="font-medium">{filtrando ? "Nenhum produto com esse filtro" : "Nenhum achadinho cadastrado ainda"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtrando ? "Limpe o filtro ou a busca para ver todos." : "Cole o link de afiliado do Mercado Livre e o produto fica pronto em segundos."}
        </p>
        {!filtrando && <Link href="/achadinhos-admin/novo" className="mt-4 inline-block text-sm font-medium text-primary underline">Cadastrar o primeiro produto</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erro && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      <div className={pendente ? "opacity-70 transition-opacity" : "transition-opacity"}>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="w-20">Ordem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => {
                const info = STATUS_INFO[p.status];
                const noAr = p.status === "ativo";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.imagem_principal ? <img src={p.imagem_principal} alt="" className="h-11 w-11 shrink-0 rounded-md border border-border object-cover" /> : <div className="h-11 w-11 shrink-0 rounded-md border border-dashed border-border" aria-hidden />}
                        <div className="min-w-0">
                          <Link href={`/achadinhos-admin/${p.id}`} className="block max-w-[260px] truncate font-medium hover:underline">{p.nome}</Link>
                          <p className="truncate text-xs text-muted-foreground">/{p.slug}{p.categoria ? ` · ${p.categoria}` : ""}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge label={info.label} tone={info.tone} /></TableCell>
                    <TableCell className="text-right tabular-nums">{p.preco_atual != null ? formatCurrency(p.preco_atual) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.cliques.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Input
                        type="number" defaultValue={p.ordem} aria-label={`Ordem de ${p.nome}`} className="h-8 w-16 px-2"
                        onBlur={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && n !== p.ordem) rodar(() => alterarOrdemAction(p.id, n)); }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" title={p.destaque ? "Tirar dos destaques" : "Destacar no site"} aria-pressed={p.destaque} onClick={() => rodar(() => alternarDestaqueAction(p.id, !p.destaque))}>
                          <Star className={p.destaque ? "fill-warning text-warning" : ""} />
                        </Button>
                        {noAr
                          ? <Button size="sm" variant="ghost" title="Pausar (sai do site)" onClick={() => rodar(() => mudarStatusAction(p.id, "pausado"))}><Pause /></Button>
                          : <Button size="sm" variant="ghost" title="Ativar (vai pro site)" onClick={() => rodar(() => mudarStatusAction(p.id, "ativo"))}><Play /></Button>}
                        {p.status !== "arquivado" && <Button size="sm" variant="ghost" title="Arquivar" onClick={() => rodar(() => mudarStatusAction(p.id, "arquivado"))}><Archive /></Button>}
                        <Button size="sm" variant="ghost" title="Copiar endereço da página" onClick={() => copiar(p)}>{copiado === p.id ? <Check className="text-success" /> : <Copy />}</Button>
                        {noAr && <Link href={`/achadinhos/${p.slug}`} target="_blank" title="Abrir no site" className="inline-flex h-8 items-center rounded-md px-2 text-muted-foreground hover:bg-accent"><ExternalLink className="h-4 w-4" /></Link>}
                        <Link href={`/achadinhos-admin/${p.id}`} title="Editar" className="inline-flex h-8 items-center rounded-md px-2 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></Link>
                        {podeExcluir && <Button size="sm" variant="ghost" title="Excluir" onClick={() => setExcluindo(p)}><Trash2 className="text-danger" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{excluindo?.nome}”?</DialogTitle>
            <DialogDescription>
              O produto sai do site e some desta lista, mas o histórico de cliques e o registro de atividade ficam guardados. O endereço /{excluindo?.slug} não é reaproveitado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" loading={pendente} onClick={() => { const p = excluindo!; setExcluindo(null); rodar(() => excluirProdutoAction(p.id)); }}>Excluir produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
