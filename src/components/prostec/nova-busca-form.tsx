"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executarBuscaProstecAction } from "@/services/prostec/prostec.actions";

const CIDADES_SUGERIDAS_PADRAO = ["Araguari - MG", "Uberlândia - MG", "Patrocínio - MG", "Uberaba - MG", "Araxá - MG"];

export function NovaBuscaForm({ cidadesSugeridas }: { cidadesSugeridas?: string[] }) {
  const cidades = cidadesSugeridas?.length ? cidadesSugeridas : CIDADES_SUGERIDAS_PADRAO;
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("MG");
  const [quantidade, setQuantidade] = useState("20");
  const [segmentos, setSegmentos] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ leadsCriados: number; leadsAtualizados: number; totalEncontrado: number } | null>(null);

  function handleBuscar() {
    setErro(null);
    setResultado(null);
    const formData = new FormData();
    formData.set("city", cidade);
    formData.set("state", uf);
    formData.set("quantity", quantidade);
    formData.set("segments", segmentos);

    startTransition(async () => {
      const result = await executarBuscaProstecAction(formData);
      if (!result.success) return setErro(result.error);
      setResultado(result.data);
    });
  }

  if (!aberto) {
    return (
      <Button type="button" size="sm" onClick={() => setAberto(true)} className="gap-1.5">
        <Search className="h-3.5 w-3.5" />Nova busca (Google Places)
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Buscar empresas novas</p>
      <p className="text-xs text-muted-foreground">Busca real no Google Places — analisa o site de cada empresa encontrada, uma por uma. Buscas grandes podem demorar; comece com uma quantidade baixa.</p>

      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className="h-9 text-xs" list="cidades-sugeridas" />
        <datalist id="cidades-sugeridas">{cidades.map((c) => <option key={c} value={c.split(" - ")[0]} />)}</datalist>
        <Input placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} className="h-9 text-xs" />
      </div>

      <Input placeholder="Segmentos separados por vírgula (vazio = todos)" value={segmentos} onChange={(e) => setSegmentos(e.target.value)} className="h-9 text-xs" />
      <Input type="number" placeholder="Quantidade (recomendo começar com 20)" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="h-9 text-xs" />

      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      {resultado && (
        <p className="text-[11px] text-success">
          Busca concluída — {resultado.totalEncontrado} empresa(s) encontrada(s), {resultado.leadsCriados} lead(s) novo(s), {resultado.leadsAtualizados} atualizado(s).
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleBuscar} disabled={isPending}>{isPending ? "Buscando... (pode demorar)" : "Buscar"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>
      </div>
    </div>
  );
}
