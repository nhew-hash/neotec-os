"use client";

import { useState } from "react";
import { Repeat, Check } from "lucide-react";
import { criarTradeInAction } from "@/services/loja/trade-in.actions";

export default function TradeInPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [modelo, setModelo] = useState("");
  const [armazenamento, setArmazenamento] = useState("");
  const [condicao, setCondicao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEnviar() {
    setErro(null);
    setEnviando(true);
    const result = await criarTradeInAction({
      nomeContato: nome, telefoneContato: telefone, modeloAparelho: modelo,
      armazenamento, condicaoRelatada: condicao, observacoes,
    });
    setEnviando(false);
    if (!result.success) return setErro(result.error);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Recebemos seu pedido!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nossa equipe vai avaliar as informações do seu {modelo} e te chamar no WhatsApp com uma proposta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Repeat className="h-6 w-6" />
        </div>
        <h1 className="font-display text-section-title text-foreground">Troque seu aparelho usado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conta pra gente sobre o seu aparelho — nossa equipe avalia e te chama no WhatsApp com uma proposta pra usar de entrada.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] p-6">
        <input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
        <input placeholder="WhatsApp (DDD + número)" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
        <input placeholder="Modelo do aparelho (ex: iPhone 12)" value={modelo} onChange={(e) => setModelo(e.target.value)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
        <input placeholder="Armazenamento (ex: 128GB)" value={armazenamento} onChange={(e) => setArmazenamento(e.target.value)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
        <select value={condicao} onChange={(e) => setCondicao(e.target.value)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">Estado de conservação</option>
          <option value="excelente">Excelente — sem riscos, tudo funcionando</option>
          <option value="bom">Bom — riscos leves de uso</option>
          <option value="regular">Regular — riscos visíveis ou algum problema</option>
          <option value="ruim">Ruim — tela trincada ou não liga</option>
        </select>
        <textarea placeholder="Alguma observação? (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

        {erro && <p className="text-xs text-danger">{erro}</p>}

        <button
          type="button"
          onClick={handleEnviar}
          disabled={enviando || !nome || !telefone || !modelo}
          className="mt-1 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Solicitar avaliação"}
        </button>
      </div>
    </div>
  );
}
