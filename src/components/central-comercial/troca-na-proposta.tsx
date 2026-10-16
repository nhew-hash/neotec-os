"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NovaAvaliacaoForm, type AvaliacaoRegistrada } from "@/components/trade-in/nova-avaliacao-form";
import { listarModelosTrocaAction } from "@/services/central-comercial/central-comercial.actions";
import { aprovarAvaliacaoAction } from "@/services/trade-in/trade-in.actions";
import type { TrocaModeloComAvarias } from "@/services/trade-in/aplicacao.service";
import { formatCurrency } from "@/utils/format";
import { FotosPeloCelular } from "@/components/celular/fotos-pelo-celular";

/**
 * Avaliar o aparelho do cliente SEM sair da proposta (antes abria /trade-in/nova
 * em outra aba e a vendedora tinha de voltar e "atualizar"). Usa o mesmo
 * formulário e o mesmo motor da tela de Trade-in; a aprovação é a mesma ação
 * de lá (mesma permissão). Avaliação bloqueada por avaria crítica não é
 * aprovada aqui: vai para revisão na tela da avaliação.
 */
export function TrocaNaProposta({ cliente, onAprovada, abrirAoMontar = false, textoBotao, classeBotao }: {
  /** Texto e estilo do botão (ex.: chip na Comunicação). */
  textoBotao?: string;
  classeBotao?: string;
  cliente: { id: string; nome: string; telefone: string | null };
  /** Vindo do Atendimento guiado com "tem aparelho na troca": já abre o checklist. */
  abrirAoMontar?: boolean;
  onAprovada: (troca: { id: string; modeloNome: string; valor: number }) => void;
}) {
  const [aberto, setAberto] = useState(abrirAoMontar);
  const [modelos, setModelos] = useState<TrocaModeloComAvarias[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<AvaliacaoRegistrada | null>(null);
  const [pendente, start] = useTransition();
  const textoAprovar = classeBotao ? "Aprovar avaliação" : "Aprovar e usar nesta proposta";

  useEffect(() => {
    if (!aberto || modelos) return;
    listarModelosTrocaAction().then((r) => (r.success ? setModelos(r.data) : setErro(r.error)));
  }, [aberto, modelos]);

  function fechar(v: boolean) {
    setAberto(v);
    if (!v) { setRegistrada(null); setErro(null); }
  }

  function aprovar() {
    if (!registrada) return;
    setErro(null);
    start(async () => {
      const r = await aprovarAvaliacaoAction({ id: registrada.id });
      if (!r.success) return setErro(r.error);
      onAprovada({ id: registrada.id, modeloNome: registrada.modeloNome, valor: registrada.valorCalculado });
      fechar(false);
    });
  }

  return (
    <>
      {classeBotao ? (
        <button type="button" onClick={() => setAberto(true)} className={classeBotao}><Repeat className="h-3.5 w-3.5" aria-hidden />{textoBotao ?? "Avaliar troca"}</button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAberto(true)} className="h-11 justify-start gap-2">
          <Repeat className="h-4 w-4" aria-hidden /> {textoBotao ?? "Avaliar aparelho do cliente na troca"}
        </Button>
      )}
      <Sheet open={aberto} onOpenChange={fechar}>
        <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-xl">
          <SheetTitle className="font-display text-lg">Aparelho na troca — {cliente.nome.split(/\s+/)[0]}</SheetTitle>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Faça o checklist com o aparelho na mão. O valor sai do mesmo motor do site e do Trade-in.</p>

          {erro && <p role="alert" className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

          {registrada ? (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Avaliação registrada</p>
              <p className="font-medium">{registrada.modeloNome}</p>
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Fotos e IMEI do aparelho</p>
                <FotosPeloCelular contextoTipo="trade_in" contextoId={registrada.id} rotulo={`${registrada.modeloNome} · ${cliente.nome.split(/\s+/)[0]}`} lerImei />
              </div>
              {registrada.bloqueado ? (
                <>
                  <p className="text-sm text-danger">Bloqueada por avaria crítica: {registrada.motivos.join(", ") || "revisar"}. Não dá para usar na proposta sem revisão do valor.</p>
                  <Link href={`/trade-in/${registrada.id}`} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline">Abrir a avaliação para revisar →</Link>
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-semibold tabular-nums">{formatCurrency(registrada.valorCalculado)}</p>
                  <p className="text-xs text-muted-foreground">Ao usar, a avaliação é aprovada por este valor (fica registrado quem aprovou). Para mudar o valor, abra a avaliação.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={aprovar} disabled={pendente}>{pendente ? "Aprovando…" : textoAprovar}</Button>
                    <Link href={`/trade-in/${registrada.id}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center px-2 text-sm font-medium text-primary hover:underline">Ajustar valor</Link>
                  </div>
                </>
              )}
            </div>
          ) : !modelos ? (
            !erro && <p className="text-sm text-muted-foreground" role="status">Carregando a tabela de troca…</p>
          ) : (
            <NovaAvaliacaoForm modelos={modelos} cliente={cliente} onRegistrada={setRegistrada} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
