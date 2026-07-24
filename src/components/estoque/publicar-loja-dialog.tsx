"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { publicarProdutoLojaAction } from "@/services/loja/loja-admin.actions";
import type { Produto } from "@/types";

export function PublicarLojaDialog({ produto }: { produto: Produto }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(produto.visivel_loja);
  const [descricao, setDescricao] = useState(produto.descricao_loja ?? "");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSalvar() {
    setErro(null);
    startTransition(async () => {
      const result = await publicarProdutoLojaAction({ produtoId: produto.id, visivel, descricaoLoja: descricao });
      if (!result.success) return setErro(result.error);
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={produto.visivel_loja ? "outline" : "ghost"} size="sm" onClick={() => setAberto(true)}>
        <Store className="h-3.5 w-3.5" />{produto.visivel_loja ? "Na loja" : "Publicar"}
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publicar "{produto.nome}" na loja</DialogTitle></DialogHeader>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} className="h-4 w-4 accent-primary" />
              Visível na loja pública (/loja)
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descrição pública (opcional)</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Texto que o cliente vê na página do produto — pode ser diferente da descrição interna."
                rows={4}
              />
            </div>

            {produto.slug && (
              <p className="text-xs text-muted-foreground">URL: /loja/produto/<span className="font-mono">{produto.slug}</span></p>
            )}

            {erro && <p className="text-xs text-danger">{erro}</p>}

            <Button onClick={handleSalvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
