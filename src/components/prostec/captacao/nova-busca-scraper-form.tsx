"use client";

import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarBuscaAction } from "@/services/prostec/scraper/scraper.actions";

// Duplicado de propósito (client component, sem acesso a banco) — mesmo
// padrão já usado em nova-busca-form.tsx.
const SEGMENTOS_PADRAO = [
  "Restaurantes", "Clínicas", "Dentistas", "Advogados", "Contadores", "Imobiliárias",
  "Oficinas", "Auto centers", "Academias", "Salões de beleza", "Barbearias", "Lojas",
  "Construção", "Elétrica", "Refrigeração", "Empresas de serviços", "Hotéis", "Pousadas",
  "Escolas", "Cursos", "Transportadoras", "Indústrias", "Outros",
];

const DEPTHS = [5, 8, 12] as const;

export function NovaBuscaScraperForm({ onCriada }: { onCriada?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nichosSelecionados, setNichosSelecionados] = useState<string[]>([]);
  const [nichoCustom, setNichoCustom] = useState("");
  const [cidade, setCidade] = useState("Araguari");
  const [uf, setUf] = useState("MG");
  const [depth, setDepth] = useState<number>(5);
  const [buscarEmail, setBuscarEmail] = useState(false);
  const [buscarRedes, setBuscarRedes] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function alternarNicho(nicho: string) {
    setNichosSelecionados((atual) => (atual.includes(nicho) ? atual.filter((n) => n !== nicho) : [...atual, nicho]));
  }

  function adicionarNichoCustom() {
    const valor = nichoCustom.trim();
    if (!valor || nichosSelecionados.includes(valor)) return;
    setNichosSelecionados((atual) => [...atual, valor]);
    setNichoCustom("");
  }

  function handleCriar() {
    setErro(null);
    setSucesso(null);
    if (nichosSelecionados.length === 0) return setErro("Escolha pelo menos um nicho.");
    if (!cidade.trim()) return setErro("Informe a cidade.");

    startTransition(async () => {
      const result = await criarBuscaAction({
        nichos: nichosSelecionados,
        cidade: cidade.trim(),
        uf: uf.trim() || undefined,
        depth,
        buscarEmail,
        buscarRedes,
      });
      if (!result.success) return setErro(result.error);
      setSucesso(`${result.data.ids.length} busca(s) adicionada(s) à fila.`);
      setNichosSelecionados([]);
      onCriada?.();
    });
  }

  if (!aberto) {
    return (
      <Button type="button" size="sm" onClick={() => setAberto(true)} className="gap-1.5">
        <Search className="h-3.5 w-3.5" />Nova busca
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Buscar empresas no Google Maps</p>
      <p className="text-xs text-muted-foreground">
        Cada nicho selecionado vira uma busca separada na fila. Só uma busca roda por vez no scraper — as demais esperam a vez.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Nichos</span>
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTOS_PADRAO.map((nicho) => {
            const selecionado = nichosSelecionados.includes(nicho);
            return (
              <button
                key={nicho}
                type="button"
                onClick={() => alternarNicho(nicho)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selecionado ? "border-primary bg-primary text-primary-foreground" : "border-black/[0.08] bg-white text-foreground hover:bg-secondary"
                }`}
              >
                {nicho}
              </button>
            );
          })}
          {nichosSelecionados
            .filter((n) => !SEGMENTOS_PADRAO.includes(n))
            .map((nicho) => (
              <button
                key={nicho}
                type="button"
                onClick={() => alternarNicho(nicho)}
                className="flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
              >
                {nicho}<X className="h-3 w-3" />
              </button>
            ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Outro nicho (opcional)"
            value={nichoCustom}
            onChange={(e) => setNichoCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarNichoCustom(); } }}
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={adicionarNichoCustom}>Adicionar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className="h-9 text-xs" />
        <Input placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} className="h-9 text-xs" />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Profundidade da busca</span>
        <div className="flex gap-1.5">
          {DEPTHS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDepth(d)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                depth === d ? "border-primary bg-primary text-primary-foreground" : "border-black/[0.08] bg-white text-foreground hover:bg-secondary"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="checkbox" checked={buscarEmail} onChange={(e) => setBuscarEmail(e.target.checked)} className="h-3.5 w-3.5" />
          Buscar e-mail no Google Maps (deixa a busca mais lenta)
        </label>
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="checkbox" checked={buscarRedes} onChange={(e) => setBuscarRedes(e.target.checked)} className="h-3.5 w-3.5" />
          Enriquecer com redes sociais/site depois
        </label>
      </div>

      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      {sucesso && <p className="text-[11px] text-success">{sucesso}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleCriar} disabled={isPending}>{isPending ? "Criando..." : "Adicionar à fila"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>
      </div>
    </div>
  );
}
