"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { historicoPropostaAction, registrarCompartilhamentoAction, registrarRespostaAction } from "@/services/central-comercial/propostas.actions";
import { textoDoEvento, type EstadoProposta } from "@/services/central-comercial/propostas-estado";
import { formatDateTime } from "@/utils/format";

type Evento = { tipo: string; criado_em: string; usuario_nome: string | null };

export function PropostaAcoes({ orcamentoId, estado }: { orcamentoId: string; estado: EstadoProposta }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<{ erro: boolean; texto: string } | null>(null);
  const [historico, setHistorico] = useState<Evento[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const finalizada = estado === "convertida";

  function responder(resposta: "aceita" | "recusada" | "aguardando_resposta") {
    setMsg(null);
    start(async () => {
      const r = await registrarRespostaAction({ orcamentoId, resposta });
      if (!r.success) return setMsg({ erro: true, texto: r.error });
      setMsg(r.data.historico ? null : { erro: false, texto: "Registrado, mas o histórico detalhado não está ativo (migration fase268 pendente)." });
      setHistorico(null);
      router.refresh();
    });
  }
  function marcarEnviada() {
    setMsg(null);
    start(async () => {
      const r = await registrarCompartilhamentoAction({ orcamentoId, tipo: "enviada_manual" });
      if (!r.success) return setMsg({ erro: true, texto: r.error });
      setHistorico(null);
      router.refresh();
    });
  }
  async function alternarHistorico() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir && historico === null) {
      const r = await historicoPropostaAction(orcamentoId);
      setHistorico(r.success ? r.data : []);
    }
  }

  return (
    <div className="space-y-2">
      {!finalizada && (
        <div className="flex flex-wrap gap-2">
          {(estado === "calculada" || estado === "compartilhada") && <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={marcarEnviada}>Já enviei</Button>}
          {estado !== "aceita" && <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={() => responder("aceita")}>Cliente aceitou</Button>}
          {estado !== "recusada" && <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={() => responder("recusada")}>Cliente recusou</Button>}
          {estado !== "aguardando_resposta" && estado !== "aceita" && estado !== "recusada" && <Button type="button" size="sm" variant="ghost" disabled={pendente} onClick={() => responder("aguardando_resposta")}>Aguardando resposta</Button>}
        </div>
      )}
      {msg && <p role={msg.erro ? "alert" : "status"} className={msg.erro ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{msg.texto}</p>}
      <button type="button" onClick={alternarHistorico} aria-expanded={aberto} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        Histórico <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {aberto && (
        historico === null ? <p className="text-xs text-muted-foreground">Carregando…</p>
          : historico.length === 0 ? <p className="text-xs text-muted-foreground">Sem eventos registrados.</p>
          : <ol className="space-y-1 border-l border-border pl-3 text-xs">
              {historico.map((e, i) => <li key={i}><span className="font-medium">{textoDoEvento(e.tipo)}</span> <span className="text-muted-foreground">· {e.usuario_nome ?? "sistema"} · {formatDateTime(e.criado_em)}</span></li>)}
            </ol>
      )}
    </div>
  );
}
