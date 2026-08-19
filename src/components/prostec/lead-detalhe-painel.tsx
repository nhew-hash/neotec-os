"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  adicionarNotaLeadAction, registrarContatoLeadAction, agendarFollowupLeadAction, concluirFollowupLeadAction,
} from "@/services/prostec/prostec.actions";
import { formatDate, formatDateTime } from "@/utils";
import type { ProstecLeadDetalhe } from "@/services/prostec/prostec.service";

const TIPOS_CONTATO = ["ligacao", "whatsapp", "email", "outro"];
const RESULTADOS_CONTATO = ["sem_resposta", "atendeu", "numero_invalido", "interessado", "sem_interesse"];

export function LeadDetalhePainel({ lead }: { lead: ProstecLeadDetalhe }) {
  const [isPending, startTransition] = useTransition();

  // Nota
  const [nota, setNota] = useState("");

  // Contato
  const [tipoContato, setTipoContato] = useState("whatsapp");
  const [resultadoContato, setResultadoContato] = useState("atendeu");
  const [obsContato, setObsContato] = useState("");

  // Follow-up
  const [dataFollowup, setDataFollowup] = useState("");
  const [horaFollowup, setHoraFollowup] = useState("");
  const [obsFollowup, setObsFollowup] = useState("");

  function handleAdicionarNota() {
    if (!nota.trim()) return;
    startTransition(() => { void adicionarNotaLeadAction(lead.id, nota); });
    setNota("");
  }

  function handleRegistrarContato() {
    startTransition(() => { void registrarContatoLeadAction(lead.id, tipoContato, resultadoContato, obsContato); });
    setObsContato("");
  }

  function handleAgendarFollowup() {
    if (!dataFollowup) return;
    startTransition(() => { void agendarFollowupLeadAction(lead.id, dataFollowup, horaFollowup, obsFollowup); });
    setDataFollowup(""); setHoraFollowup(""); setObsFollowup("");
  }

  const followupsPendentes = lead.followups.filter((f) => !f.done);

  return (
    <div className="flex flex-col gap-4">
      {followupsPendentes.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Follow-ups agendados</h2>
          <div className="flex flex-col gap-2">
            {followupsPendentes.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs">
                <span>{formatDate(f.next_contact_date)}{f.next_contact_time && ` às ${f.next_contact_time}`} {f.observation && `— ${f.observation}`}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => startTransition(() => { void concluirFollowupLeadAction(f.id, lead.id); })}>Concluir</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Registrar contato</h2>
        <div className="grid grid-cols-2 gap-2">
          <Select value={tipoContato} onValueChange={setTipoContato}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS_CONTATO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={resultadoContato} onValueChange={setResultadoContato}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{RESULTADOS_CONTATO.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Textarea placeholder="Observação (opcional)" value={obsContato} onChange={(e) => setObsContato(e.target.value)} className="mt-2 text-xs" rows={2} />
        <Button type="button" size="sm" onClick={handleRegistrarContato} disabled={isPending} className="mt-2">Registrar</Button>

        {lead.contacts.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-black/[0.04] pt-3">
            {lead.contacts.map((c) => (
              <div key={c.id} className="text-xs">
                <p className="text-foreground">{c.contact_type} — <span className="font-medium">{c.result.replace("_", " ")}</span>{c.notes && ` — ${c.notes}`}</p>
                <p className="text-muted-foreground">{c.user?.nome ?? "—"} · {formatDateTime(c.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Agendar follow-up</h2>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dataFollowup} onChange={(e) => setDataFollowup(e.target.value)} className="h-9 text-xs" />
          <Input type="time" value={horaFollowup} onChange={(e) => setHoraFollowup(e.target.value)} className="h-9 text-xs" />
        </div>
        <Input placeholder="Observação (opcional)" value={obsFollowup} onChange={(e) => setObsFollowup(e.target.value)} className="mt-2 h-9 text-xs" />
        <Button type="button" size="sm" onClick={handleAgendarFollowup} disabled={isPending} className="mt-2">Agendar</Button>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Notas</h2>
        <Textarea placeholder="Escreve uma nota sobre esse lead..." value={nota} onChange={(e) => setNota(e.target.value)} className="text-xs" rows={2} />
        <Button type="button" size="sm" onClick={handleAdicionarNota} disabled={isPending} className="mt-2">Salvar nota</Button>

        {lead.notes.length > 0 && (
          <div className={cn("mt-4 flex flex-col gap-2 border-t border-black/[0.04] pt-3")}>
            {lead.notes.map((n) => (
              <div key={n.id} className="text-xs">
                <p className="text-foreground">{n.note}</p>
                <p className="text-muted-foreground">{n.user?.nome ?? "—"} · {formatDateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
