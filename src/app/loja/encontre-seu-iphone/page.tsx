"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { gerarRecomendacoesQuizAction } from "@/services/loja/quiz-recomendacao.actions";
import { formatCurrency } from "@/utils";
import type { RespostasQuiz, RecomendacaoQuiz } from "@/services/loja/quiz-recomendacao.service";

const FAIXAS_ORCAMENTO = [
  { valor: 2000, label: "Até R$ 2.000" },
  { valor: 3000, label: "Até R$ 3.000" },
  { valor: 5000, label: "Até R$ 5.000" },
  { valor: 999999, label: "Sem limite definido" },
];

const PRIORIDADES: { valor: RespostasQuiz["prioridade"]; label: string; emoji: string }[] = [
  { valor: "camera", label: "Câmera", emoji: "📸" },
  { valor: "bateria", label: "Bateria", emoji: "🔋" },
  { valor: "desempenho", label: "Desempenho", emoji: "⚡" },
  { valor: "jogos", label: "Jogos", emoji: "🎮" },
  { valor: "trabalho", label: "Trabalho", emoji: "💼" },
];

const CONDICOES: { valor: RespostasQuiz["condicao"]; label: string }[] = [
  { valor: "novo", label: "Novo (lacrado)" },
  { valor: "seminovo", label: "Seminovo" },
  { valor: "qualquer", label: "Tanto faz" },
];

export default function EncontreSeuIphonePage() {
  const [etapa, setEtapa] = useState(0);
  const [orcamentoMax, setOrcamentoMax] = useState<number | null>(null);
  const [prioridade, setPrioridade] = useState<RespostasQuiz["prioridade"] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [recomendacoes, setRecomendacoes] = useState<RecomendacaoQuiz[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFinalizar(condicaoEscolhida: RespostasQuiz["condicao"]) {
    if (!orcamentoMax || !prioridade) return;
    setCarregando(true);
    setErro(null);

    const result = await gerarRecomendacoesQuizAction({ orcamentoMax, prioridade, condicao: condicaoEscolhida });
    setCarregando(false);

    if (!result.success) return setErro(result.error);
    setRecomendacoes(result.data.recomendacoes);
  }

  function handleReiniciar() {
    setEtapa(0);
    setOrcamentoMax(null);
    setPrioridade(null);
    setRecomendacoes(null);
    setErro(null);
  }

  if (carregando) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Cruzando com o estoque disponível...</p>
      </div>
    );
  }

  if (recomendacoes) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Recomendações pra você</h1>
        <p className="mb-8 text-sm text-muted-foreground">Baseado no que você respondeu e no que temos disponível agora.</p>

        {recomendacoes.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] p-8 text-center">
            <p className="text-sm text-foreground">Não encontramos nenhum aparelho disponível dentro desse orçamento agora.</p>
            <a href="https://wa.me/5534999999999" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Falar no WhatsApp</a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recomendacoes.map((r, i) => (
              <Link
                key={i}
                href={!r.slug ? "#" : r.tipoLink === "lacrado" ? `/loja/lacrados/${r.slug}` : `/loja/produto/${r.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] p-5 transition-colors hover:border-primary/30"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.nome} <span className="font-normal text-muted-foreground">— {r.condicao}</span></p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.porQue}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-base font-bold text-foreground">{formatCurrency(r.preco)}</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <button type="button" onClick={handleReiniciar} className="mt-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-3.5 w-3.5" />Refazer o quiz
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-8 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${i <= etapa ? "bg-primary" : "bg-black/10"}`} />
        ))}
      </div>

      {erro && <p className="mb-4 text-sm text-danger">{erro}</p>}

      {etapa === 0 && (
        <>
          <h1 className="font-display text-2xl font-semibold text-foreground">Quanto você quer gastar?</h1>
          <div className="mt-8 flex w-full flex-col gap-2.5">
            {FAIXAS_ORCAMENTO.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => { setOrcamentoMax(f.valor); setEtapa(1); }}
                className="rounded-2xl border border-black/[0.08] py-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {etapa === 1 && (
        <>
          <h1 className="font-display text-2xl font-semibold text-foreground">O que é mais importante pra você?</h1>
          <div className="mt-8 grid w-full grid-cols-2 gap-2.5">
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => { setPrioridade(p.valor); setEtapa(2); }}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/[0.08] py-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="text-2xl">{p.emoji}</span>{p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {etapa === 2 && (
        <>
          <h1 className="font-display text-2xl font-semibold text-foreground">Novo ou seminovo?</h1>
          <div className="mt-8 flex w-full flex-col gap-2.5">
            {CONDICOES.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => handleFinalizar(c.valor)}
                className="rounded-2xl border border-black/[0.08] py-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
