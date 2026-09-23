"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aprovarAvaliacaoAction, reprovarAvaliacaoAction, cancelarAvaliacaoAction, converterAvaliacaoEmEstoqueAction } from "@/services/trade-in/trade-in.actions";
import { STATUS_LABEL, STATUS_TONE } from "./status";
import type { AvaliacaoTradeIn } from "@/services/trade-in/aplicacao.service";
import { formatCurrency } from "@/utils";

export function AvaliacaoDetalhe({ avaliacao }: { avaliacao: AvaliacaoTradeIn }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valorEditado, setValorEditado] = useState(String(avaliacao.valor_calculado));
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const editando = Number(valorEditado) !== avaliacao.valor_calculado;
  const podeDecidir = ["estimativa", "aguardando_avaliacao", "em_avaliacao"].includes(avaliacao.status);

  const [imei, setImei] = useState(avaliacao.imei ?? "");
  const [categoria, setCategoria] = useState<"iphone" | "android" | "ipad" | "mac" | "acessorio">("iphone");
  const [cor, setCor] = useState("");
  const [memoria, setMemoria] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");

  function aprovar() {
    setErro(null);
    startTransition(async () => {
      const result = await aprovarAvaliacaoAction({
        id: avaliacao.id,
        valorAprovado: Number(valorEditado),
        motivoAlteracao: editando ? motivo : undefined,
      });
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  function reprovar() {
    setErro(null);
    startTransition(async () => {
      const result = await reprovarAvaliacaoAction(avaliacao.id, motivo || undefined);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  function cancelar() {
    startTransition(async () => {
      await cancelarAvaliacaoAction(avaliacao.id);
      router.refresh();
    });
  }

  function converterEmEstoque() {
    setErro(null);
    startTransition(async () => {
      const result = await converterAvaliacaoEmEstoqueAction({
        avaliacaoId: avaliacao.id,
        imei,
        categoria,
        cor: cor || undefined,
        memoria: memoria || undefined,
        precoVenda: precoVenda ? Number(precoVenda) : undefined,
      });
      if (!result.success) return setErro(result.error);
      router.push(`/estoque/aparelhos/${result.data.aparelhoId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-foreground">{avaliacao.modelo_nome}</p>
              <p className="text-xs text-muted-foreground">
                {avaliacao.cliente_nome ?? "Cliente não identificado"}
                {avaliacao.cliente_telefone ? ` — ${avaliacao.cliente_telefone}` : ""}
                {avaliacao.imei ? ` — IMEI ${avaliacao.imei}` : ""}
              </p>
            </div>
            <StatusBadge label={STATUS_LABEL[avaliacao.status]} tone={STATUS_TONE[avaliacao.status]} />
          </div>

          <div className="grid gap-1 text-sm">
            <p>Valor base: {formatCurrency(avaliacao.valor_base)}</p>
            {avaliacao.avarias_marcadas.map((a) => (
              <p key={a.codigo} className="text-muted-foreground">— {a.nome}: -{formatCurrency(a.desconto)}</p>
            ))}
            {avaliacao.bonus_valor > 0 && <p className="text-success">+ Bônus: {formatCurrency(avaliacao.bonus_valor)}</p>}
            {avaliacao.bloqueado && (
              <p className="font-semibold text-danger">Bloqueado: {avaliacao.motivos_bloqueio.join(", ")}</p>
            )}
            <p className="text-base font-semibold text-foreground">Valor calculado: {formatCurrency(avaliacao.valor_calculado)}</p>
            {avaliacao.valor_aprovado != null && (
              <p className="text-base font-semibold text-success">Valor aprovado: {formatCurrency(avaliacao.valor_aprovado)}</p>
            )}
            {avaliacao.valor_alterado_motivo && (
              <p className="text-xs text-muted-foreground">Motivo da alteração: {avaliacao.valor_alterado_motivo}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {podeDecidir && !avaliacao.bloqueado && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium text-foreground">Aprovar / editar valor</p>
            <Input type="number" step="0.01" value={valorEditado} onChange={(e) => setValorEditado(e.target.value)} className="sm:w-56" />
            {editando && (
              <Textarea placeholder="Motivo da alteração (obrigatório ao mudar o valor calculado)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            )}
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={aprovar} disabled={isPending}>{isPending ? "Salvando..." : "Aprovar"}</Button>
              <Button variant="destructive" onClick={reprovar} disabled={isPending}>Recusar</Button>
              <Button variant="outline" onClick={cancelar} disabled={isPending}>Cancelar avaliação</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {avaliacao.status === "aprovado" && !avaliacao.aparelho_id && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium text-foreground">Converter em item de estoque</p>
            <p className="text-xs text-muted-foreground">Cria o aparelho no catálogo com custo de aquisição = valor aprovado do trade-in. Preencha só quando o aparelho já estiver fisicamente na loja.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="IMEI" value={imei} onChange={(e) => setImei(e.target.value)} />
              <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iphone">iPhone</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="ipad">iPad</SelectItem>
                  <SelectItem value="mac">Mac</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Cor (opcional)" value={cor} onChange={(e) => setCor(e.target.value)} />
              <Input placeholder="Memória (ex: 128GB, opcional)" value={memoria} onChange={(e) => setMemoria(e.target.value)} />
              <Input type="number" placeholder="Preço de venda (opcional — pode definir depois)" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
            </div>
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <Button onClick={converterEmEstoque} disabled={isPending || !imei.trim()} className="w-fit">
              {isPending ? "Convertendo..." : "Converter para estoque"}
            </Button>
          </CardContent>
        </Card>
      )}

      {podeDecidir && avaliacao.bloqueado && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm text-danger">Essa avaliação está bloqueada por uma avaria crítica ({avaliacao.motivos_bloqueio.join(", ")}) e não pode ser aprovada por aqui. Registre o motivo da recusa para o cliente.</p>
            <Textarea placeholder="Motivo da recusa" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={reprovar} disabled={isPending}>Recusar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
