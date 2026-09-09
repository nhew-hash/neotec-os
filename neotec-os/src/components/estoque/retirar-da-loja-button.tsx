"use client";

import { useState } from "react";
import { Clock, EyeOff } from "lucide-react";
import {
  agendarRetiradaProdutoAction, agendarRetiradaAparelhoAction,
  retirarProdutoDaLojaAction, retirarAparelhoDaLojaAction,
} from "@/services/estoque/estoque.actions";

export function RetirarDaLojaButton({
  tipo, itemId, publicadoAgora, retirarEmAtual,
}: {
  tipo: "produto" | "aparelho";
  itemId: string;
  publicadoAgora: boolean;
  retirarEmAtual: string | null;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agendadoPara, setAgendadoPara] = useState(retirarEmAtual);
  const [retiradoAgora, setRetiradoAgora] = useState(false);

  const acaoAgendar = tipo === "produto" ? agendarRetiradaProdutoAction : agendarRetiradaAparelhoAction;
  const acaoRetirarAgora = tipo === "produto" ? retirarProdutoDaLojaAction : retirarAparelhoDaLojaAction;

  async function handleRetirarAgora() {
    setProcessando(true);
    setErro(null);
    const result = await acaoRetirarAgora(itemId);
    setProcessando(false);
    if (!result.success) return setErro(result.error);
    setRetiradoAgora(true);
  }

  async function handleAgendar() {
    setProcessando(true);
    setErro(null);
    const result = await acaoAgendar(itemId, 1);
    setProcessando(false);
    if (!result.success) return setErro(result.error);
    const data = new Date();
    const pulo = data.getDay() === 5 ? 3 : data.getDay() === 6 ? 2 : 1; // sexta pula pra segunda, sábado pula pra segunda
    data.setDate(data.getDate() + pulo);
    setAgendadoPara(data.toISOString());
  }

  async function handleCancelarAgendamento() {
    setProcessando(true);
    const result = await acaoAgendar(itemId, null);
    setProcessando(false);
    if (result.success) setAgendadoPara(null);
  }

  if (retiradoAgora) {
    return <p className="text-xs text-muted-foreground">Retirado da loja. Atualiza a página pra ver refletido em tudo.</p>;
  }

  if (!publicadoAgora) return null; // só faz sentido pra item que está publicado

  if (agendadoPara) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Clock className="h-3.5 w-3.5 text-warning" />
        <span className="text-muted-foreground">Sai da loja em {new Date(agendadoPara).toLocaleDateString("pt-BR")}</span>
        <button type="button" onClick={handleCancelarAgendamento} disabled={processando} className="text-primary hover:underline">Cancelar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button type="button" onClick={handleRetirarAgora} disabled={processando} className="flex items-center gap-1 rounded-md border border-danger/30 px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/5">
          <EyeOff className="h-3 w-3" />Retirar agora
        </button>
        <button type="button" onClick={handleAgendar} disabled={processando} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
          <Clock className="h-3 w-3" />Retirar em 1 dia útil
        </button>
      </div>
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
    </div>
  );
}
