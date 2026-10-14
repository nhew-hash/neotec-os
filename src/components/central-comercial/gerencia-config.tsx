"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alternarModeloChecklistAction, criarModeloChecklistAction, definirMetaAction } from "@/services/central-comercial/central-comercial.actions";
import type { ModeloChecklist } from "@/services/central-comercial/regras";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function NovaTarefaForm() {
  const router = useRouter();
  const [titulo, setTitulo] = useState(""); const [descricao, setDescricao] = useState("");
  const [cargo, setCargo] = useState("vendedor"); const [frequencia, setFrequencia] = useState("diaria");
  const [diaSemana, setDiaSemana] = useState("1"); const [diaMes, setDiaMes] = useState("1"); const [prazo, setPrazo] = useState("18:00");
  const [erro, setErro] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const [pendente, start] = useTransition();
  function salvar() {
    setErro(null); setOk(false);
    start(async () => {
      const r = await criarModeloChecklistAction({
        titulo, descricao, cargo: cargo as "vendedor", frequencia: frequencia as "diaria", prazo_hora: prazo,
        dia_semana: frequencia === "semanal" ? Number(diaSemana) : null, dia_mes: frequencia === "mensal" ? Number(diaMes) : null,
      });
      if (!r.success) return setErro(r.error);
      setTitulo(""); setDescricao(""); setOk(true); router.refresh();
    });
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium">Nova tarefa da rotina</p>
      <Input placeholder="Ex.: Conferir vitrine e preços" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Nome da tarefa" />
      <Input placeholder="Detalhes (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label="Detalhes" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs"><span>Quem faz</span>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={cargo} onChange={(e) => setCargo(e.target.value)}>
            <option value="vendedor">Vendedoras</option><option value="gerente">Gerente</option><option value="tecnico">Técnicos</option><option value="caixa">Caixa</option>
          </select></label>
        <label className="flex flex-col gap-1 text-xs"><span>Repete</span>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={frequencia} onChange={(e) => setFrequencia(e.target.value)}>
            <option value="diaria">Todo dia</option><option value="semanal">Toda semana</option><option value="mensal">Todo mês</option>
          </select></label>
        {frequencia === "semanal" && (
          <label className="flex flex-col gap-1 text-xs"><span>Dia da semana</span>
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
              {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select></label>
        )}
        {frequencia === "mensal" && (
          <label className="flex flex-col gap-1 text-xs"><span>Dia do mês</span>
            <Input type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(e.target.value)} /></label>
        )}
        <label className="flex flex-col gap-1 text-xs"><span>Prazo (horário)</span>
          <Input type="time" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
      </div>
      <div className="flex items-center gap-3"><Button onClick={salvar} disabled={pendente}>Criar tarefa</Button>
        {ok && <span role="status" className="text-sm text-success">Tarefa criada. Ela aparece a partir de hoje.</span>}</div>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
    </Card>
  );
}

export function ModelosLista({ modelos }: { modelos: ModeloChecklist[] }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  if (modelos.length === 0) return <Card className="p-4 text-sm text-muted-foreground">Nenhuma tarefa cadastrada ainda.</Card>;
  return (
    <Card className="px-4"><ul className="divide-y divide-border">
      {modelos.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
          <span className="flex-1"><span className={m.ativo ? "font-medium" : "text-muted-foreground line-through"}>{m.titulo}</span>
            <span className="block text-xs text-muted-foreground">{m.cargo} · {m.frequencia === "diaria" ? "todo dia" : m.frequencia === "semanal" ? `toda ${DIAS[m.dia_semana ?? 0]}` : `dia ${m.dia_mes} de cada mês`} · até {m.prazo_hora.slice(0, 5)}</span></span>
          <Button size="sm" variant="outline" disabled={pendente} onClick={() => start(async () => { await alternarModeloChecklistAction(m.id, !m.ativo); router.refresh(); })}>{m.ativo ? "Pausar" : "Reativar"}</Button>
        </li>
      ))}
    </ul></Card>
  );
}

export function MetaForm({ usuarioId, rotulo }: { usuarioId: string | null; rotulo: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [erro, setErro] = useState(false);
  const [pendente, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="w-40" inputMode="decimal" placeholder="Meta do mês (R$)" value={valor} onChange={(e) => setValor(e.target.value)} aria-label={`Meta do mês: ${rotulo}`} />
      <Button size="sm" variant="outline" disabled={pendente || !valor} onClick={() => start(async () => {
        const n = Number(valor.replace(/\./g, "").replace(",", "."));
        const r = await definirMetaAction(usuarioId, n);
        setErro(!r.success); setMsg(r.success ? "Meta salva." : r.error); if (r.success) { setValor(""); router.refresh(); }
      })}>Definir meta de {rotulo}</Button>
      {msg && <span role={erro ? "alert" : "status"} className={erro ? "text-sm text-danger" : "text-sm text-success"}>{msg}</span>}
    </div>
  );
}

export function ConfigBotForm({ inicial, podeEditar }: { inicial: { modo: "assistente" | "automatico"; hora_inicio: number; hora_fim: number; permite_domingo: boolean; configurado: boolean }; podeEditar: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState(inicial.modo); const [ini, setIni] = useState(String(inicial.hora_inicio)); const [fim, setFim] = useState(String(inicial.hora_fim));
  const [dom, setDom] = useState(inicial.permite_domingo); const [msg, setMsg] = useState<string | null>(null); const [erro, setErro] = useState(false);
  const [pendente, start] = useTransition();
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div><p className="text-sm font-medium">Modo do bot e horário de contato</p>
        <p className="text-xs text-muted-foreground">No modo assistente o sistema apenas sugere; quem envia é a equipe. {inicial.configurado ? "" : "Ainda não configurado: vale o padrão (assistente, 9h às 19h, sem domingo)."}</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs"><span>Modo</span>
          <select disabled={!podeEditar} className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={modo} onChange={(e) => setModo(e.target.value as "assistente")}>
            <option value="assistente">Assistente (recomendado)</option><option value="automatico">Automático</option></select></label>
        <label className="flex flex-col gap-1 text-xs"><span>Começa às (h)</span><Input disabled={!podeEditar} type="number" min={0} max={23} value={ini} onChange={(e) => setIni(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs"><span>Termina às (h)</span><Input disabled={!podeEditar} type="number" min={1} max={24} value={fim} onChange={(e) => setFim(e.target.value)} /></label>
        <label className="flex items-end gap-2 pb-2 text-sm"><input disabled={!podeEditar} type="checkbox" checked={dom} onChange={(e) => setDom(e.target.checked)} /> Contatar aos domingos</label>
      </div>
      {podeEditar ? (
        <div className="flex items-center gap-3">
          <Button disabled={pendente} onClick={() => start(async () => {
            const { salvarConfigBotAction } = await import("@/services/ia/sugestoes-comerciais.actions");
            const r = await salvarConfigBotAction({ modo, hora_inicio: Number(ini), hora_fim: Number(fim), permite_domingo: dom });
            setErro(!r.success); setMsg(r.success ? "Configuração salva." : r.error); if (r.success) router.refresh();
          })}>Salvar</Button>
          {msg && <span role={erro ? "alert" : "status"} className={erro ? "text-sm text-danger" : "text-sm text-success"}>{msg}</span>}
        </div>
      ) : <p className="text-xs text-muted-foreground">Só o administrador altera esta configuração.</p>}
    </Card>
  );
}
