"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { criarRegraLucroAction, removerRegraLucroAction, definirRegraPadraoAction } from "@/services/seminovos/seminovos.actions";
import { formatCurrency } from "@/utils";
import type { RegraLucroComFaixas, TipoRegraLucro } from "@/services/seminovos/regras-lucro.service";

const LABEL_TIPO: Record<TipoRegraLucro, string> = { fixo: "Valor fixo", percentual: "Percentual", faixa: "Por faixa de valor" };

export function RegrasLucroPanel({ regras }: { regras: RegraLucroComFaixas[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoRegraLucro>("percentual");
  const [valorFixo, setValorFixo] = useState("");
  const [percentual, setPercentual] = useState("");
  const [faixas, setFaixas] = useState<{ valorAte: string; lucro: string }[]>([{ valorAte: "2000", lucro: "300" }]);
  const [erro, setErro] = useState<string | null>(null);

  function adicionarFaixa() {
    setFaixas((prev) => [...prev, { valorAte: "", lucro: "" }]);
  }

  function handleCriar() {
    setErro(null);
    if (!nome.trim()) return setErro("Dá um nome pra regra");

    startTransition(async () => {
      const result = await criarRegraLucroAction({
        nome,
        tipo,
        valorFixo: tipo === "fixo" ? Number(valorFixo) : undefined,
        percentual: tipo === "percentual" ? Number(percentual) : undefined,
        faixas: tipo === "faixa" ? faixas.map((f) => ({ valorAte: f.valorAte ? Number(f.valorAte) : null, lucro: Number(f.lucro) })) : undefined,
      });
      if (!result.success) return setErro(result.error);
      setMostrarForm(false);
      setNome("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">A IA de cadastro sempre aplica a regra marcada como padrão, a não ser que você escolha outra na hora.</p>
        <Button size="sm" variant="outline" onClick={() => setMostrarForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />Nova regra
        </Button>
      </div>

      {mostrarForm && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <Input placeholder="Nome da regra (ex: Padrão seminovos)" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRegraLucro)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Valor fixo</SelectItem>
                <SelectItem value="percentual">Percentual</SelectItem>
                <SelectItem value="faixa">Por faixa de valor</SelectItem>
              </SelectContent>
            </Select>

            {tipo === "fixo" && <Input type="number" placeholder="Lucro fixo em R$ (ex: 300)" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} />}
            {tipo === "percentual" && <Input type="number" placeholder="Percentual (ex: 12)" value={percentual} onChange={(e) => setPercentual(e.target.value)} />}

            {tipo === "faixa" && (
              <div className="flex flex-col gap-2">
                {faixas.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Até R$ (vazio = acima de todas)" value={f.valorAte} onChange={(e) => setFaixas((prev) => prev.map((x, idx) => idx === i ? { ...x, valorAte: e.target.value } : x))} />
                    <Input placeholder="Lucro R$" value={f.lucro} onChange={(e) => setFaixas((prev) => prev.map((x, idx) => idx === i ? { ...x, lucro: e.target.value } : x))} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={adicionarFaixa} className="w-fit">
                  <Plus className="h-3.5 w-3.5" />Adicionar faixa
                </Button>
              </div>
            )}

            {erro && <p className="text-xs text-danger">{erro}</p>}
            <Button onClick={handleCriar} disabled={isPending} className="w-fit">{isPending ? "Salvando..." : "Criar regra"}</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {regras.map((regra) => (
          <Card key={regra.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{regra.nome}</span>
                  {regra.padrao && <Badge><Star className="h-3 w-3" />Padrão</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {LABEL_TIPO[regra.tipo]}
                  {regra.tipo === "fixo" && ` — ${formatCurrency(regra.valor_fixo ?? 0)}`}
                  {regra.tipo === "percentual" && ` — ${regra.percentual}%`}
                  {regra.tipo === "faixa" && ` — ${regra.faixas.length} faixa(s)`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!regra.padrao && (
                  <Button variant="outline" size="sm" onClick={() => startTransition(async () => { await definirRegraPadraoAction(regra.id); router.refresh(); })} disabled={isPending}>
                    Tornar padrão
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => startTransition(async () => { await removerRegraLucroAction(regra.id); router.refresh(); })} disabled={isPending}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
