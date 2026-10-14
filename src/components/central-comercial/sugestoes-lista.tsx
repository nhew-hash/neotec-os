"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { adiarSugestaoAction, aprovarEEnviarSugestaoAction, descartarSugestaoAction } from "@/services/ia/sugestoes-comerciais.actions";
import type { SugestaoComercial } from "@/services/ia/sugestoes-comerciais.service";
import { formatDateTime } from "@/utils/format";

const ROTULO: Record<string, string> = {
  cliente_aguardando: "Cliente aguardando", pediu_preco: "Pediu preço", cliente_parou: "Parou de responder",
  objecao_preco: "Objeção: preço", objecao_parcelamento: "Objeção: parcelamento", objecao_concorrencia: "Objeção: concorrência",
  objecao_confianca: "Objeção: confiança", objecao_troca: "Dúvida sobre troca", retomar_depois: "Retomar contato",
  perto_de_fechar: "Perto de fechar", precisa_gerente: "Precisa da gerente", sem_responsavel: "Sem responsável",
};
const TOM: Record<number, StatusTone> = { 1: "danger", 2: "warning", 3: "neutral" };
const ROTULO_PRIORIDADE: Record<number, string> = { 1: "Urgente", 2: "Normal", 3: "Baixa" };

function Cartao({ s }: { s: SugestaoComercial }) {
  const router = useRouter();
  const [texto, setTexto] = useState(s.mensagem_sugerida ?? "");
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function executar(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErro(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) return setErro(r.error ?? "Não foi possível concluir.");
      router.refresh();
    });
  }
  const amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString(); };
  const emUmaHora = () => new Date(Date.now() + 3_600_000).toISOString();

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={ROTULO_PRIORIDADE[s.prioridade]} tone={TOM[s.prioridade]} />
        <span className="text-sm font-medium">{s.cliente_nome ?? s.telefone ?? "Cliente"}</span>
        <span className="text-xs text-muted-foreground">{ROTULO[s.tipo] ?? s.tipo}</span>
        <span className="ml-auto text-xs text-muted-foreground">Melhor horário: {formatDateTime(s.horario_recomendado)}</span>
      </div>
      <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Por que:</span> {s.motivo}</p>
      {s.mensagem_sugerida !== null ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Mensagem (você pode editar antes de enviar)</span>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
        </label>
      ) : (
        <p className="text-sm">Sem mensagem pronta para este caso. Abra a conversa e responda pessoalmente.</p>
      )}
      {erro && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      {descartando ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <Button variant="outline" size="sm" disabled={pendente} onClick={() => executar(() => descartarSugestaoAction(s.id, motivo))}>Confirmar descarte</Button>
          <Button variant="ghost" size="sm" onClick={() => setDescartando(false)}>Voltar</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {s.mensagem_sugerida !== null && <Button size="sm" disabled={pendente || texto.trim().length < 2} onClick={() => executar(() => aprovarEEnviarSugestaoAction(s.id, texto))}>Enviar mensagem</Button>}
          <Button variant="outline" size="sm" disabled={pendente} onClick={() => executar(() => adiarSugestaoAction(s.id, emUmaHora()))}>Adiar 1 hora</Button>
          <Button variant="outline" size="sm" disabled={pendente} onClick={() => executar(() => adiarSugestaoAction(s.id, amanha()))}>Adiar para amanhã</Button>
          <Button variant="ghost" size="sm" disabled={pendente} onClick={() => setDescartando(true)}>Descartar</Button>
        </div>
      )}
    </Card>
  );
}

export function SugestoesLista({ sugestoes }: { sugestoes: SugestaoComercial[] }) {
  if (sugestoes.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">Nenhum follow-up sugerido agora. As sugestões aparecem aqui quando um cliente fica sem resposta, pede preço ou esfria.</Card>;
  }
  return <div className="flex flex-col gap-3">{sugestoes.map((s) => <Cartao key={s.id} s={s} />)}</div>;
}
