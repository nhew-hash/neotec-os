"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { atualizarVarianteLacradoAction } from "@/services/lacrados/lacrados.actions";
import { UploadFotosProduto } from "@/components/estoque/upload-fotos-produto";
import { formatCurrency } from "@/utils";
import type { ModeloComVariantes } from "@/services/lacrados/lacrados.service";

function ModeloRow({ modelo }: { modelo: ModeloComVariantes }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const emEstoque = modelo.variantes.filter((v) => v.quantidade > 0).length;

  function salvar(varianteId: string, campo: "quantidade" | "preco_venda", valor: number) {
    startTransition(async () => {
      await atualizarVarianteLacradoAction(varianteId, { [campo]: valor });
      router.refresh();
    });
  }

  return (
    <Card>
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{modelo.nome}</span>
          <span className="text-xs text-muted-foreground">{modelo.variantes.length} variantes · {emEstoque} com estoque</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <CardContent className="flex flex-col gap-4 border-t border-border pt-4">
          <UploadFotosProduto tabela="catalogo_lacrados_modelos" itemId={modelo.id} fotosIniciais={modelo.fotos} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {modelo.variantes.map((v) => (
            <div key={v.id} className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
              <span className="text-xs font-medium text-foreground">{v.cor} · {v.armazenamento}</span>
              <div className="flex gap-1.5">
                <Input
                  type="number" min={0} defaultValue={v.quantidade}
                  onBlur={(e) => salvar(v.id, "quantidade", Number(e.target.value) || 0)}
                  className="h-8 text-xs" disabled={isPending}
                  title="Quantidade em estoque"
                />
                <Input
                  type="number" step="0.01" min={0} defaultValue={v.preco_venda ?? ""}
                  placeholder="Preço"
                  onBlur={(e) => salvar(v.id, "preco_venda", Number(e.target.value) || 0)}
                  className="h-8 text-xs" disabled={isPending}
                />
              </div>
              {v.quantidade > 0 && v.preco_venda != null && (
                <span className="text-[10px] text-success">Disponível — {formatCurrency(v.preco_venda)}</span>
              )}
            </div>
          ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function LacradosGestaoPanel({ modelos }: { modelos: ModeloComVariantes[] }) {
  return (
    <div className="flex flex-col gap-2">
      {modelos.map((modelo) => <ModeloRow key={modelo.id} modelo={modelo} />)}
    </div>
  );
}
