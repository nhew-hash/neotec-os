"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { atualizarPrecoVendaAction } from "@/services/estoque/preco-venda.actions";
import { formatCurrency, parseCurrencyBRL } from "@/utils";

interface EditarPrecoDialogProps {
  tipo: "produto" | "aparelho";
  id: string;
  nome: string;
  /** IMEI (aparelho) ou slug (produto) — só mostra a linha se existir; nunca inventa um código. */
  identificador?: string | null;
  precoAtual: number | null;
  /** Quando setado, o Pricing Engine usa ESSE valor em vez de `preco_venda` pra calcular vitrine/Pix/parcelas — avisa pra não confundir o lojista. */
  precoLiquidoDesejado?: number | null;
}

/**
 * Fase 257 — editar preço de venda direto da listagem do Estoque.
 * Dois passos dentro do mesmo modal: digitar o novo preço → confirmar
 * (mostra atual/novo antes de salvar, pedido explícito de segurança).
 * `router.refresh()` no sucesso — reflete em todo canto que usa
 * `preco_venda` sem precisar recarregar a página manualmente.
 */
export function EditarPrecoDialog({ tipo, id, nome, identificador, precoAtual, precoLiquidoDesejado }: EditarPrecoDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<"editar" | "confirmar">("editar");
  const [valorDigitado, setValorDigitado] = useState(precoAtual != null ? String(precoAtual).replace(".", ",") : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const novoPreco = parseCurrencyBRL(valorDigitado);

  function abrir() {
    setValorDigitado(precoAtual != null ? String(precoAtual).replace(".", ",") : "");
    setErro(null);
    setEtapa("editar");
    setAberto(true);
  }

  function handleAvancar() {
    if (novoPreco == null) return setErro("Informe um preço válido (ex: 1.890,00)");
    if (novoPreco <= 0) return setErro("O preço não pode ser negativo nem zero");
    setErro(null);
    setEtapa("confirmar");
  }

  async function handleConfirmar() {
    if (novoPreco == null) return; // não deveria chegar aqui sem passar pela validação acima
    setSalvando(true);
    setErro(null);
    const result = await atualizarPrecoVendaAction({ tipo, id, novoPreco });
    setSalvando(false);
    if (!result.success) return setErro(result.error);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Editar preço"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>{etapa === "editar" ? "Editar preço de venda" : "Confirmar alteração de preço"}</DialogTitle></DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1 border-b border-border pb-3">
              <span className="font-medium text-foreground">{nome}</span>
              {identificador && <span className="font-mono text-xs text-muted-foreground">{identificador}</span>}
            </div>

            {etapa === "editar" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Preço atual</label>
                  <p className="text-foreground">{precoAtual != null ? formatCurrency(precoAtual) : "— (sem preço definido)"}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Novo preço</label>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={valorDigitado}
                    onChange={(e) => setValorDigitado(e.target.value)}
                    placeholder="R$ 1.890,00"
                    className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  />
                </div>

                {precoLiquidoDesejado != null && (
                  <p className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning-text">
                    Este item tem um "preço líquido desejado" configurado ({formatCurrency(precoLiquidoDesejado)}) — é ele, não o preço de venda, que define o preço mostrado na loja (Pix/parcelamento). Editar aqui não muda isso.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Preço atual</span>
                  <span className="font-medium text-foreground">{precoAtual != null ? formatCurrency(precoAtual) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo preço</span>
                  <span className="font-semibold text-primary">{formatCurrency(novoPreco ?? 0)}</span>
                </div>
              </div>
            )}

            {erro && <p className="text-xs text-danger">{erro}</p>}
          </div>

          <DialogFooter>
            {etapa === "editar" ? (
              <Button onClick={handleAvancar}>Continuar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEtapa("editar")} disabled={salvando}>Cancelar</Button>
                <Button onClick={handleConfirmar} disabled={salvando}>{salvando ? "Salvando..." : "Confirmar alteração"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
