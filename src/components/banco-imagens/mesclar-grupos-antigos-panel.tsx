"use client";

import { useState, useTransition } from "react";
import { Loader2, GitMerge, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mesclarGruposAntigosAction } from "@/services/banco-imagens/banco-imagens.actions";
import type { RelatorioMesclagem } from "@/services/banco-imagens/banco-imagens.service";

const MOTIVO_LABEL: Record<string, string> = {
  sem_grupo_novo_compativel: "Nenhum grupo novo compatível",
  ambiguo: "Bate com mais de um grupo novo",
};

/**
 * Fase 249, problema 1 — grupos criados antes da importação em lote (sem
 * origem_id, cor simplificada como "Branco" em vez de "Estelar") competem
 * com os grupos novos equivalentes. Esse painel mostra uma prévia
 * (dry-run) de quais grupos antigos seriam mesclados nos novos antes de
 * aplicar de verdade.
 */
export function MesclarGruposAntigosPanel() {
  const [previa, setPrevia] = useState<RelatorioMesclagem | null>(null);
  const [aplicado, setAplicado] = useState<RelatorioMesclagem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, startCarregar] = useTransition();
  const [aplicando, startAplicar] = useTransition();

  function handlePrever() {
    setErro(null);
    setAplicado(null);
    startCarregar(async () => {
      const resultado = await mesclarGruposAntigosAction(true);
      if (!resultado.success) return setErro(resultado.error);
      setPrevia(resultado.data);
    });
  }

  function handleAplicar() {
    setErro(null);
    startAplicar(async () => {
      const resultado = await mesclarGruposAntigosAction(false);
      if (!resultado.success) return setErro(resultado.error);
      setAplicado(resultado.data);
      setPrevia(null);
    });
  }

  const relatorio = aplicado ?? previa;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Grupos antigos (sem origem_id, cor simplificada — "Branco" em vez de "Estelar") que competem com um grupo novo equivalente são mesclados
          no grupo novo: os vínculos (produtos/aparelhos/lacrados) são movidos e o grupo antigo é apagado.
        </p>
        <Button size="sm" variant="outline" onClick={handlePrever} disabled={carregando || aplicando}>
          {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
          Ver prévia
        </Button>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      {relatorio && (
        <div className="flex flex-col gap-4">
          {aplicado && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />Mesclagem aplicada.
            </p>
          )}

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              {aplicado ? "Mesclados" : "Seriam mesclados"} ({relatorio.mesclados.length})
            </p>
            {relatorio.mesclados.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum grupo antigo bate sozinho com um único grupo novo.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {relatorio.mesclados.map((m) => (
                  <li key={m.antigoId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs">
                    <span className="text-foreground">Grupo antigo {m.antigoId} → grupo novo (origem_id: {m.novoOrigemId})</span>
                    <Badge variant="secondary" className="text-[10px]">{m.vinculosMovidos} vínculo(s) movido(s)</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Não mesclados ({relatorio.naoMesclados.length})</p>
            {relatorio.naoMesclados.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum caso pendente.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {relatorio.naoMesclados.map((n) => (
                  <li key={n.antigoId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-xs">
                    <span className="text-foreground">
                      {n.marca} {n.modelo}{n.cor ? ` — ${n.cor}` : ""} (grupo {n.antigoId})
                    </span>
                    <span className="text-muted-foreground">
                      {MOTIVO_LABEL[n.motivo] ?? n.motivo}
                      {n.candidatos.length > 0 ? `: ${n.candidatos.join(", ")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!aplicado && (
            <div>
              <Button size="sm" onClick={handleAplicar} disabled={aplicando || relatorio.mesclados.length === 0}>
                {aplicando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
                Mesclar grupos antigos
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
