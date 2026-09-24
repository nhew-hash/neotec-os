"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CHECKLIST_TRADE_IN, avariasDoChecklist, OPCOES_TAMPA_TRASEIRA } from "@/services/trade-in/checklist";
import { calcularPreviaTradeInAction, criarAvaliacaoAction } from "@/services/trade-in/trade-in.actions";
import type { TrocaModeloComAvarias } from "@/services/trade-in/aplicacao.service";
import type { ResultadoAvaliacaoTradeIn } from "@/services/trade-in/motor";
import { formatCurrency } from "@/utils";

type Resposta = "ok" | "reprovado";

export function NovaAvaliacaoForm({ modelos }: { modelos: TrocaModeloComAvarias[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  // Fase 250 — estado da tampa traseira: seleção única entre as 4 opções,
  // separado do resto do checklist (que é OK/Reprovado). Default "sem
  // danos" (nenhuma avaria marcada) até o funcionário escolher outra coisa.
  const [tampaTraseiraId, setTampaTraseiraId] = useState<string>("sem_danos");
  const [bateriaSaude, setBateriaSaude] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [imei, setImei] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [previa, setPrevia] = useState<{ modeloNome: string; resultado: ResultadoAvaliacaoTradeIn } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const modeloSelecionado = useMemo(() => modelos.find((m) => m.id === modeloId) ?? null, [modelos, modeloId]);
  const modelosFiltrados = useMemo(() => {
    if (!busca.trim()) return modelos.slice(0, 8);
    const termo = busca.trim().toLowerCase();
    return modelos.filter((m) => m.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [modelos, busca]);

  function selecionarModelo(id: string) {
    setModeloId(id);
    setPrevia(null);
    const modelo = modelos.find((m) => m.id === id);
    setBusca(modelo?.nome ?? "");
  }

  /** Códigos do checklist OK/Reprovado + o código da tampa traseira escolhida (se houver). */
  function montarCodigos(): string[] {
    const codigos = new Set(avariasDoChecklist(respostas));
    const codigoTraseira = OPCOES_TAMPA_TRASEIRA.find((o) => o.id === tampaTraseiraId)?.avariaCodigo;
    if (codigoTraseira) codigos.add(codigoTraseira);
    return [...codigos];
  }

  function calcular() {
    setErro(null);
    if (!modeloSelecionado) return setErro("Selecione o modelo do aparelho");

    startTransition(async () => {
      const codigos = montarCodigos();
      const result = await calcularPreviaTradeInAction({
        modeloId: modeloSelecionado.id,
        avariasMarcadas: codigos,
        bateriaSaude: bateriaSaude ? Number(bateriaSaude) : null,
      });
      if (!result.success) return setErro(result.error);
      if ("encontrado" in result.data && result.data.encontrado === false) return setErro(result.data.mensagem);
      if ("modelo" in result.data) setPrevia({ modeloNome: result.data.modelo.nome, resultado: result.data.resultado });
    });
  }

  function registrar() {
    setErro(null);
    if (!modeloSelecionado) return setErro("Selecione o modelo do aparelho");

    startTransition(async () => {
      const codigos = montarCodigos();
      const result = await criarAvaliacaoAction({
        origem: "neotec_os",
        modeloId: modeloSelecionado.id,
        avariasMarcadas: codigos,
        bateriaSaude: bateriaSaude ? Number(bateriaSaude) : null,
        checklistRespostas: respostas,
        clienteNome: clienteNome || null,
        clienteTelefone: clienteTelefone || null,
        imei: imei || null,
        observacoes: observacoes || null,
      });
      if (!result.success) return setErro(result.error);
      if ("encontrado" in result.data && result.data.encontrado === false) return setErro(result.data.mensagem);
      if ("avaliacao" in result.data) router.push(`/trade-in/${result.data.avaliacao.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Label>Aparelho</Label>
          <Input placeholder="Buscar modelo (ex: iPhone 13 128GB)" value={busca} onChange={(e) => { setBusca(e.target.value); setModeloId(null); setPrevia(null); }} />
          {!modeloSelecionado && busca.trim() && (
            <div className="flex flex-col gap-1 rounded-md border border-border p-1">
              {modelosFiltrados.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum modelo encontrado — cadastre em Trade-in &gt; Tabela de valores.</p>}
              {modelosFiltrados.map((m) => (
                <button key={m.id} type="button" onClick={() => selecionarModelo(m.id)} className="rounded px-2 py-1.5 text-left text-sm hover:bg-secondary">
                  {m.nome} <span className="text-xs text-muted-foreground">— base {formatCurrency(m.valor_troca)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Nome do cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
            <Input placeholder="Telefone" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} />
            <Input placeholder="IMEI" value={imei} onChange={(e) => setImei(e.target.value)} />
          </div>
          <Input type="number" min={0} max={100} placeholder="Saúde da bateria (%)" value={bateriaSaude} onChange={(e) => setBateriaSaude(e.target.value)} className="sm:w-56" />
        </CardContent>
      </Card>

      {modeloSelecionado && (
        <Card>
          <CardContent className="flex flex-col gap-5 p-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Estado da tampa traseira</p>
              <div className="flex flex-wrap gap-1.5">
                {OPCOES_TAMPA_TRASEIRA.map((op) => (
                  <Button
                    key={op.id}
                    type="button"
                    size="sm"
                    variant={tampaTraseiraId === op.id ? (op.id === "quebrada" ? "destructive" : "default") : "outline"}
                    onClick={() => setTampaTraseiraId(op.id)}
                  >
                    {op.titulo}
                  </Button>
                ))}
              </div>
            </div>

            {CHECKLIST_TRADE_IN.map((grupo) => (
              <div key={grupo.grupo} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{grupo.grupo}</p>
                <div className="flex flex-col gap-1.5">
                  {grupo.itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                      <div>
                        <p className="text-sm text-foreground">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">{item.como}</p>
                        {item.alerta && <p className="text-xs text-warning">{item.alerta}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="sm" variant={respostas[item.id] === "ok" ? "default" : "outline"} onClick={() => setRespostas((prev) => ({ ...prev, [item.id]: "ok" }))}>OK</Button>
                        <Button type="button" size="sm" variant={respostas[item.id] === "reprovado" ? "destructive" : "outline"} onClick={() => setRespostas((prev) => ({ ...prev, [item.id]: "reprovado" }))}>Reprovado</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Textarea placeholder="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

            {erro && <p className="text-xs text-danger">{erro}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={calcular} disabled={isPending}>Calcular</Button>
              <Button type="button" onClick={registrar} disabled={isPending}>{isPending ? "Salvando..." : "Registrar avaliação"}</Button>
            </div>

            {previa && (
              <Card className="bg-secondary/40">
                <CardContent className="flex flex-col gap-2 p-4 text-sm">
                  <p className="font-medium text-foreground">{previa.modeloNome}</p>
                  <p>Valor base: {formatCurrency(previa.resultado.valorBase)}</p>
                  {previa.resultado.ajustes.map((a) => (
                    <p key={a.codigo} className="text-muted-foreground">— {a.nome}: -{formatCurrency(a.desconto)}</p>
                  ))}
                  {previa.resultado.bonus > 0 && <p className="text-success">+ Bônus: {formatCurrency(previa.resultado.bonus)}</p>}
                  {previa.resultado.bloqueado ? (
                    <p className="font-semibold text-danger">Bloqueado: {previa.resultado.motivos.join(", ")}</p>
                  ) : (
                    <p className="text-base font-semibold text-foreground">Valor calculado: {formatCurrency(previa.resultado.valorFinal)}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
