"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  salvarModeloTradeInAction,
  duplicarModeloTradeInAction,
  desativarModeloTradeInAction,
  salvarConfigTradeInAction,
} from "@/services/trade-in/trade-in.actions";
import type { TrocaModeloComAvarias, TrocaAvaria } from "@/services/trade-in/aplicacao.service";
import { formatCurrency } from "@/utils";

interface Props {
  modelos: TrocaModeloComAvarias[];
  avarias: TrocaAvaria[];
  config: { bateriaCorte: number; bonusSeminovo: number; regrasTexto: string };
}

export function ModelosTradeInPanel({ modelos, avarias, config }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState<TrocaModeloComAvarias | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [cfgBateria, setCfgBateria] = useState(String(config.bateriaCorte));
  const [cfgBonus, setCfgBonus] = useState(String(config.bonusSeminovo));
  const [cfgTexto, setCfgTexto] = useState(config.regrasTexto);

  function salvarConfig() {
    startTransition(async () => {
      const result = await salvarConfigTradeInAction({ bateriaCorte: Number(cfgBateria), bonusSeminovo: Number(cfgBonus), regrasTexto: cfgTexto });
      if (!result.success) setErro(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-sm font-medium text-foreground">Configuração geral</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Corte de bateria (%) — abaixo disso marca a avaria &quot;bateria&quot; sozinho</label>
              <Input type="number" min={0} max={100} value={cfgBateria} onChange={(e) => setCfgBateria(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bônus por troca + compra de seminovo (R$)</label>
              <Input type="number" min={0} value={cfgBonus} onChange={(e) => setCfgBonus(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Regras exibidas ao cliente no site (uma por linha)</label>
            <Textarea value={cfgTexto} onChange={(e) => setCfgTexto(e.target.value)} rows={4} />
          </div>
          <Button onClick={salvarConfig} disabled={isPending} className="w-fit">Salvar configuração</Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Tabela de valores de troca</p>
        <Button size="sm" variant="outline" onClick={() => setEditando("novo")}>
          <Plus className="h-3.5 w-3.5" />Novo modelo
        </Button>
      </div>

      {editando && (
        <ModeloForm
          modelo={editando === "novo" ? null : editando}
          avarias={avarias}
          onFechar={() => setEditando(null)}
          onSalvo={() => { setEditando(null); router.refresh(); }}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modelo</TableHead>
            <TableHead>Família</TableHead>
            <TableHead>Valor de troca</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {modelos.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.nome}</TableCell>
              <TableCell className="text-muted-foreground">{m.familia}</TableCell>
              <TableCell>{formatCurrency(m.valor_troca)}</TableCell>
              <TableCell><Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditando(m)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => startTransition(async () => { await duplicarModeloTradeInAction(m.id); router.refresh(); })} disabled={isPending}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {m.ativo && (
                    <Button size="sm" variant="ghost" onClick={() => startTransition(async () => { await desativarModeloTradeInAction(m.id); router.refresh(); })} disabled={isPending}>
                      <EyeOff className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}

function ModeloForm({
  modelo,
  avarias,
  onFechar,
  onSalvo,
}: {
  modelo: TrocaModeloComAvarias | null;
  avarias: TrocaAvaria[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState(modelo?.nome ?? "");
  const [familia, setFamilia] = useState(modelo?.familia ?? "");
  const [valorTroca, setValorTroca] = useState(String(modelo?.valor_troca ?? ""));
  const [observacoes, setObservacoes] = useState(modelo?.observacoes ?? "");
  const [ativo, setAtivo] = useState(modelo?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);

  const descontosIniciais = useMemo(() => {
    const mapa = new Map(modelo?.avarias.map((a) => [a.avaria_codigo, a.desconto]) ?? []);
    return avarias.map((a) => ({ codigo: a.codigo, nome: a.nome, bloqueia: a.bloqueia, desconto: mapa.get(a.codigo) ?? 0 }));
  }, [modelo, avarias]);
  const [descontos, setDescontos] = useState(descontosIniciais);

  function salvar() {
    setErro(null);
    if (!nome.trim() || !familia.trim() || !valorTroca) return setErro("Preencha modelo, família e valor de troca");

    startTransition(async () => {
      const result = await salvarModeloTradeInAction({
        id: modelo?.id,
        nome,
        familia,
        valorTroca: Number(valorTroca),
        ativo,
        observacoes: observacoes || null,
        avarias: descontos.filter((d) => d.desconto > 0 || d.bloqueia).map((d) => ({ avariaCodigo: d.codigo, desconto: d.desconto })),
      });
      if (!result.success) return setErro(result.error);
      onSalvo();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Nome (ex: iPhone 13 128GB)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Família (ex: iPhone 13)" value={familia} onChange={(e) => setFamilia(e.target.value)} />
          <Input type="number" min={0} placeholder="Valor de troca (R$)" value={valorTroca} onChange={(e) => setValorTroca(e.target.value)} />
        </div>
        <Textarea placeholder="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Desconto por avaria para este modelo (deixe 0 se a avaria não se aplica)</p>
          {descontos.map((d, i) => (
            <div key={d.codigo} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-sm">{d.nome} {d.bloqueia && <Badge variant="danger" className="ml-1">bloqueia</Badge>}</span>
              <Input
                type="number"
                min={0}
                disabled={d.bloqueia}
                value={d.desconto}
                onChange={(e) => setDescontos((prev) => prev.map((x, idx) => idx === i ? { ...x, desconto: Number(e.target.value) } : x))}
                className="w-32"
              />
            </div>
          ))}
        </div>

        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo (visível no site/bot)
        </label>

        {erro && <p className="text-xs text-danger">{erro}</p>}
        <div className="flex gap-2">
          <Button onClick={salvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar modelo"}</Button>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
