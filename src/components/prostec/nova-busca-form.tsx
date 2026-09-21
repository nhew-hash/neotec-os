"use client";

import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executarBuscaProstecAction } from "@/services/prostec/prostec.actions";

const CIDADES_SUGERIDAS_PADRAO = ["Araguari - MG", "Uberlândia - MG", "Patrocínio - MG", "Uberaba - MG", "Araxá - MG"];

// Duplicado de src/services/prostec/lib/settings-padrao.ts de propósito
// — esse arquivo é client component, e a lista é só dado estático (sem
// acesso a banco), então duplicar aqui evita qualquer risco de puxar
// código de servidor pro bundle do cliente sem necessidade.
const SEGMENTOS_PADRAO = [
  "Restaurantes", "Clínicas", "Dentistas", "Advogados", "Contadores", "Imobiliárias",
  "Oficinas", "Auto centers", "Academias", "Salões de beleza", "Barbearias", "Lojas",
  "Construção", "Elétrica", "Refrigeração", "Empresas de serviços", "Hotéis", "Pousadas",
  "Escolas", "Cursos", "Transportadoras", "Indústrias", "Outros",
];

export function NovaBuscaForm({ cidadesSugeridas, segmentosDisponiveis }: { cidadesSugeridas?: string[]; segmentosDisponiveis?: string[] }) {
  const cidades = cidadesSugeridas?.length ? cidadesSugeridas : CIDADES_SUGERIDAS_PADRAO;
  const segmentosBase = segmentosDisponiveis?.length ? segmentosDisponiveis : SEGMENTOS_PADRAO;
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("MG");
  const [quantidade, setQuantidade] = useState("20");
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [segmentoCustom, setSegmentoCustom] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ leadsCriados: number; leadsAtualizados: number; totalEncontrado: number } | null>(null);

  function alternarSegmento(segmento: string) {
    setSegmentosSelecionados((atual) =>
      atual.includes(segmento) ? atual.filter((s) => s !== segmento) : [...atual, segmento]
    );
  }

  function adicionarSegmentoCustom() {
    const valor = segmentoCustom.trim();
    if (!valor || segmentosSelecionados.includes(valor)) return;
    setSegmentosSelecionados((atual) => [...atual, valor]);
    setSegmentoCustom("");
  }

  function handleBuscar() {
    setErro(null);
    setResultado(null);
    const formData = new FormData();
    formData.set("city", cidade);
    formData.set("state", uf);
    formData.set("quantity", quantidade);
    formData.set("segments", segmentosSelecionados.join(","));

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

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Segmentos (vazio = todos)</span>
          {segmentosSelecionados.length > 0 && (
            <button type="button" onClick={() => setSegmentosSelecionados([])} className="text-[11px] text-muted-foreground underline hover:text-foreground">
              Limpar seleção
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {segmentosBase.map((segmento) => {
            const selecionado = segmentosSelecionados.includes(segmento);
            return (
              <button
                key={segmento}
                type="button"
                onClick={() => alternarSegmento(segmento)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selecionado ? "border-primary bg-primary text-primary-foreground" : "border-black/[0.08] bg-white text-foreground hover:bg-secondary"
                }`}
              >
                {segmento}
              </button>
            );
          })}
          {segmentosSelecionados
            .filter((s) => !segmentosBase.includes(s))
            .map((segmento) => (
              <button
                key={segmento}
                type="button"
                onClick={() => alternarSegmento(segmento)}
                className="flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
              >
                {segmento}<X className="h-3 w-3" />
              </button>
            ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Outro segmento (opcional)"
            value={segmentoCustom}
            onChange={(e) => setSegmentoCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarSegmentoCustom(); } }}
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={adicionarSegmentoCustom}>Adicionar</Button>
        </div>
      </div>
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
