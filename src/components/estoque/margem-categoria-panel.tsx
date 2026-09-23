"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RegraLucroComFaixas } from "@/services/seminovos/regras-lucro.service";
import {
  salvarMargemCategoriaAction,
  removerMargemCategoriaAction,
  type CategoriaFolha,
  type MargemCategoria,
} from "@/services/importacao-fornecedores/margem.actions";

const LABEL_CONDICAO: Record<string, string> = { "": "Qualquer condição", Lacrado: "Lacrado", Seminovo: "Seminovo" };

function descreverMargem(margem: MargemCategoria, regras: RegraLucroComFaixas[]): string {
  if (margem.regra_lucro_id) {
    const regra = regras.find((r) => r.id === margem.regra_lucro_id);
    return regra ? `Regra "${regra.nome}"` : "Regra removida — escolha outra";
  }
  if (margem.percentual) return `${margem.percentual}%`;
  if (margem.valor_fixo) return `+ R$ ${margem.valor_fixo}`;
  return "Preço do fornecedor (sem margem)";
}

export function MargemCategoriaPanel({
  categorias,
  margensIniciais,
  regras,
}: {
  categorias: CategoriaFolha[];
  margensIniciais: MargemCategoria[];
  regras: RegraLucroComFaixas[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [categoriaSlug, setCategoriaSlug] = useState(categorias[0]?.slug ?? "");
  const [condicao, setCondicao] = useState<"" | "Lacrado" | "Seminovo">("");
  const [modo, setModo] = useState<"regra" | "fixo" | "percentual">(regras.length > 0 ? "regra" : "percentual");
  const [regraLucroId, setRegraLucroId] = useState(regras[0]?.id ?? "");
  const [valorFixo, setValorFixo] = useState("");
  const [percentual, setPercentual] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    if (modo === "regra" && !regraLucroId) return setErro("Escolha uma regra de lucro (ou cadastre uma nova primeiro)");

    startTransition(async () => {
      const resultado = await salvarMargemCategoriaAction({
        categoriaSlug,
        condicao,
        modo,
        regraLucroId: modo === "regra" ? regraLucroId : undefined,
        valorFixo: modo === "fixo" ? Number(valorFixo) : undefined,
        percentual: modo === "percentual" ? Number(percentual) : undefined,
      });
      if (!resultado.success) return setErro(resultado.error);
      setMostrarForm(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Regras de lucro por categoria</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setMostrarForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />Nova regra
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Sem regra configurada aqui: seminovo usa a regra global marcada como padrão (
          <Link href="/estoque/seminovos/regras-lucro" className="underline">gerenciar</Link>
          ); lacrado e genérico saem pelo preço do fornecedor mesmo, sem margem. Pra "até certo valor" (ex: iPhone
          seminovo com margem diferente por faixa de preço), cadastre uma regra do tipo <em>Por faixa de valor</em>{" "}
          lá e escolha ela aqui.
        </p>

        {mostrarForm && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select value={categoriaSlug} onValueChange={setCategoriaSlug}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.nomePai ? `${c.nomePai} > ${c.nome}` : c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={condicao} onValueChange={(v) => setCondicao(v as typeof condicao)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer condição</SelectItem>
                    <SelectItem value="Lacrado">Só Lacrado</SelectItem>
                    <SelectItem value="Seminovo">Só Seminovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regra">Usar regra de lucro já cadastrada (fixo, %, ou por faixa de valor)</SelectItem>
                  <SelectItem value="percentual">Percentual direto</SelectItem>
                  <SelectItem value="fixo">Valor fixo direto</SelectItem>
                </SelectContent>
              </Select>

              {modo === "regra" && (
                regras.length === 0 ? (
                  <p className="text-xs text-danger">
                    Nenhuma regra cadastrada ainda — crie uma em{" "}
                    <Link href="/estoque/seminovos/regras-lucro" className="underline">Regras de lucro</Link> primeiro.
                  </p>
                ) : (
                  <Select value={regraLucroId} onValueChange={setRegraLucroId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {regras.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nome} ({r.tipo === "faixa" ? `${r.faixas.length} faixa(s)` : r.tipo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}
              {modo === "percentual" && <Input type="number" placeholder="Percentual (ex: 12)" value={percentual} onChange={(e) => setPercentual(e.target.value)} />}
              {modo === "fixo" && <Input type="number" placeholder="Lucro fixo em R$ (ex: 300)" value={valorFixo} onChange={(e) => setValorFixo(e.target.value)} />}

              {erro && <p className="text-xs text-danger">{erro}</p>}
              <Button onClick={salvar} disabled={isPending} className="w-fit">{isPending ? "Salvando..." : "Salvar regra"}</Button>
            </CardContent>
          </Card>
        )}

        {margensIniciais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra por categoria cadastrada — usando os padrões acima pra tudo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {margensIniciais.map((margem) => {
                const categoria = categorias.find((c) => c.slug === margem.categoria_slug);
                return (
                  <TableRow key={margem.id}>
                    <TableCell>{categoria ? (categoria.nomePai ? `${categoria.nomePai} > ${categoria.nome}` : categoria.nome) : margem.categoria_slug}</TableCell>
                    <TableCell>{LABEL_CONDICAO[margem.condicao] ?? margem.condicao}</TableCell>
                    <TableCell>{descreverMargem(margem, regras)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await removerMargemCategoriaAction(margem.id); router.refresh(); })}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
