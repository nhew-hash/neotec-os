"use client";

import { useState } from "react";
import { Search, RotateCcw, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/utils";
import type { StatusOS } from "@/types";

interface ResultadoConsulta {
  numero_os: string;
  status: StatusOS;
  prazo: string | null;
  valor: number | null;
  observacoes_publicas: string | null;
}

const STATUS_INFO: Record<StatusOS, { emoji: string; label: string }> = {
  recebido: { emoji: "📥", label: "Recebido" },
  diagnostico: { emoji: "🔵", label: "Em diagnóstico" },
  orcamento: { emoji: "📋", label: "Orçamento em análise" },
  aguardando_aprovacao: { emoji: "🟡", label: "Aguardando sua aprovação" },
  em_reparo: { emoji: "🟢", label: "Em reparo" },
  teste: { emoji: "🧪", label: "Em testes finais" },
  pronto: { emoji: "✅", label: "Pronto para retirada" },
  entregue: { emoji: "📦", label: "Entregue" },
};

export function ConsultaOSForm({ numeroInicial }: { numeroInicial?: string }) {
  const [numeroOs, setNumeroOs] = useState(numeroInicial ?? "");
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<ResultadoConsulta | null | undefined>(undefined);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setResultado(undefined);

    // A normalização de verdade (154/0154/OS154 = mesma OS) acontece no
    // banco (função consultar_os_publico) — aqui só manda o que a pessoa
    // digitou, sem exigir formato nenhum dela.
    const supabase = createClient();
    const { data, error } = await supabase.rpc("consultar_os_publico", {
      p_numero_os: numeroOs.trim(),
      p_telefone: telefone,
    });

    setCarregando(false);
    if (error || !data || data.length === 0) {
      setResultado(null);
      return;
    }
    setResultado(data[0]);
  }

  function handleNovaPesquisa() {
    setResultado(undefined);
    setNumeroOs("");
    setTelefone("");
  }

  // Estado de carregamento — skeleton simples, sem pedir pra pessoa esperar no vazio.
  if (carregando) {
    return (
      <div className="animate-pulse rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.08)]">
        <div className="mb-3 h-4 w-32 rounded-full bg-secondary" />
        <div className="mb-2 h-6 w-48 rounded-full bg-secondary" />
        <div className="h-4 w-40 rounded-full bg-secondary" />
      </div>
    );
  }

  // Resultado encontrado.
  if (resultado) {
    const status = STATUS_INFO[resultado.status];
    return (
      <div className="animate-fade-in rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.08)]">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">OS {resultado.numero_os}</span>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl">{status.emoji}</span>
          <span className="font-display text-xl font-semibold text-foreground">{status.label}</span>
        </div>

        {resultado.prazo && (
          <p className="mt-4 text-sm text-muted-foreground">
            Previsão de conclusão: <strong className="text-foreground">{formatDate(resultado.prazo)}</strong>
          </p>
        )}
        {resultado.valor != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            Orçamento: <strong className="text-foreground">{formatCurrency(resultado.valor)}</strong>
          </p>
        )}
        {resultado.observacoes_publicas && (
          <p className="mt-4 rounded-2xl bg-[#F7F9FC] p-3 text-sm text-foreground">{resultado.observacoes_publicas}</p>
        )}

        <button
          type="button"
          onClick={handleNovaPesquisa}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-black/[0.06] py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <RotateCcw className="h-3.5 w-3.5" />Nova pesquisa
        </button>
      </div>
    );
  }

  // Não encontrado — mensagem humana, nunca erro técnico.
  if (resultado === null) {
    return (
      <div className="animate-fade-in rounded-3xl border border-black/[0.04] bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.08)]">
        <p className="text-[15px] text-foreground">Não encontramos nenhuma Ordem de Serviço com esses dados.</p>
        <p className="mt-1 text-sm text-muted-foreground">Confira o número e o telefone informados.</p>
        <button
          type="button"
          onClick={handleNovaPesquisa}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-3.5 w-3.5" />Nova pesquisa
        </button>
      </div>
    );
  }

  // Formulário — estado inicial.
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-3xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-8px_rgba(16,24,40,0.08)]"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Número da OS</label>
        <input
          value={numeroOs}
          onChange={(e) => setNumeroOs(e.target.value)}
          placeholder="Ex: 154"
          inputMode="numeric"
          required
          className="rounded-2xl border border-black/[0.08] px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Telefone cadastrado</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(34) 99999-9999"
          inputMode="tel"
          required
          className="rounded-2xl border border-black/[0.08] px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={carregando}
        className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Consultar
      </button>
    </form>
  );
}
