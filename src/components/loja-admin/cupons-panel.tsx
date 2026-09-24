"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { criarCupomAction, alternarCupomAtivoAction, removerCupomAction } from "@/services/loja-admin/central-loja.actions";
import { formatCurrency, formatDate } from "@/utils";
import type { Cupom, TipoDescontoCupom } from "@/types";

export function CuponsPanel({ cupons }: { cupons: Cupom[] }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState<TipoDescontoCupom>("percentual");
  const [valor, setValor] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [limiteUso, setLimiteUso] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleCriar() {
    setErro(null);
    if (!codigo.trim() || !valor) return setErro("Preenche código e valor");
    startTransition(async () => {
      const result = await criarCupomAction({
        codigo: codigo.trim(), tipoDesconto, valor: Number(valor),
        valorMinimoPedido: valorMinimo ? Number(valorMinimo) : undefined,
        limiteUso: limiteUso ? Number(limiteUso) : undefined,
        validoAte: validoAte || undefined,
      });
      if (!result.success) return setErro(result.error);
      setCodigo(""); setValor(""); setValorMinimo(""); setLimiteUso(""); setValidoAte("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        {/* Fase 250: 1 coluna no mobile (era grid-cols-2, apertava demais — o Select de
            "Cashback" com label longo ficava ilegível) e um campo de validade que a
            action já aceitava mas não estava exposto na UI. */}
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Input placeholder="Código (ex: BEMVINDO10)" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className="lg:col-span-2" />
            <Select value={tipoDesconto} onValueChange={(v) => setTipoDesconto(v as TipoDescontoCupom)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">%</SelectItem>
                <SelectItem value="valor_fixo">R$ fixo</SelectItem>
                <SelectItem value="cashback">Cashback (credita saldo)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
            <Input type="number" placeholder="Pedido mínimo (opcional)" value={valorMinimo} onChange={(e) => setValorMinimo(e.target.value)} />
            <Input type="number" placeholder="Limite de uso (opcional)" value={limiteUso} onChange={(e) => setLimiteUso(e.target.value)} />
          </div>
          <label className="flex flex-col gap-1 sm:w-56">
            <span className="text-xs text-muted-foreground">Válido até (opcional)</span>
            <Input type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </label>
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <Button onClick={handleCriar} disabled={isPending} className="w-full sm:w-fit"><Plus className="h-4 w-4" />Criar cupom</Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {cupons.map((c) => (
          <Card key={c.id}>
            {/* Fase 250: empilha texto/ações em telas pequenas (era `items-center
                justify-between` fixo, espremendo os 2 botões ao lado do texto) e
                quebra as informações em spans próprios em vez de 1 string longa
                concatenada com "·", que quebrava de forma feia no celular. */}
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="neotec-id-tag text-sm font-semibold text-foreground">{c.codigo}</span>
                  <Badge variant={c.ativo ? "success" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{c.tipo_desconto === "percentual" ? `${c.valor}% de desconto` : c.tipo_desconto === "valor_fixo" ? `${formatCurrency(c.valor)} de desconto` : `${formatCurrency(c.valor)} de cashback`}</span>
                  {c.valor_minimo_pedido != null && <span>Pedido mín. {formatCurrency(c.valor_minimo_pedido)}</span>}
                  <span>{c.limite_uso ? `Usado ${c.usos}/${c.limite_uso}` : `Usado ${c.usos}x`}</span>
                  {c.valido_ate && <span>Válido até {formatDate(c.valido_ate)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => startTransition(async () => { await alternarCupomAtivoAction(c.id, !c.ativo); router.refresh(); })} disabled={isPending}>
                  {c.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => startTransition(async () => { await removerCupomAction(c.id); router.refresh(); })} disabled={isPending}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {cupons.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>}
      </div>
    </div>
  );
}
