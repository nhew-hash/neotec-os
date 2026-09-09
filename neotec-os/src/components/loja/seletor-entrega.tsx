"use client";

import { useState } from "react";
import { Store, Truck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils";
import { useBuscaCep } from "@/hooks/use-busca-cep";
import { Input } from "@/components/ui/input";
import type { RegraFrete } from "@/types";

export interface EnderecoEntrega {
  cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string;
}

export type SelecaoEntrega =
  | { tipo: "retirada" }
  | { tipo: "entrega"; regiaoId: string; endereco: EnderecoEntrega };

interface SeletorEntregaProps {
  regras: Pick<RegraFrete, "id" | "regiao" | "valor" | "prazo_dias_uteis" | "nacional">[];
  selecionado: SelecaoEntrega;
  onSelecionar: (valor: SelecaoEntrega) => void;
}

const ENDERECO_VAZIO: EnderecoEntrega = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

/**
 * "Retirar na loja" (grátis) ou "Entrega" — nesse caso, exige CEP e
 * endereço completo. O CEP busca o endereço automaticamente (ViaCEP)
 * e tenta casar a cidade com uma região de frete já configurada; se
 * não achar nenhuma, avisa que ainda não entrega naquela cidade em
 * vez de deixar escolher uma região que não bate com o endereço real.
 */
export function SeletorEntrega({ regras, selecionado, onSelecionar }: SeletorEntregaProps) {
  const { buscar, buscando, erro: erroCep } = useBuscaCep();
  const [modoEntrega, setModoEntrega] = useState(selecionado.tipo === "entrega");
  const [endereco, setEndereco] = useState<EnderecoEntrega>(selecionado.tipo === "entrega" ? selecionado.endereco : ENDERECO_VAZIO);
  const [regiaoEncontrada, setRegiaoEncontrada] = useState<(typeof regras)[number] | null>(
    selecionado.tipo === "entrega" ? regras.find((r) => r.id === selecionado.regiaoId) ?? null : null
  );
  const [cidadeNaoAtendida, setCidadeNaoAtendida] = useState(false);

  function atualizarEndereco(patch: Partial<EnderecoEntrega>) {
    const novo = { ...endereco, ...patch };
    setEndereco(novo);
    if (regiaoEncontrada) onSelecionar({ tipo: "entrega", regiaoId: regiaoEncontrada.id, endereco: novo });
  }

  async function handleCepChange(valor: string) {
    const cepFormatado = valor.replace(/\D/g, "").slice(0, 8);
    setEndereco((prev) => ({ ...prev, cep: cepFormatado }));
    setCidadeNaoAtendida(false);

    if (cepFormatado.length !== 8) return;

    const resultado = await buscar(cepFormatado);
    if (!resultado) return;

    const matchEspecifico = regras.find((r) => !r.nacional && r.regiao.trim().toLowerCase() === resultado.cidade.trim().toLowerCase());
    const matchNacional = regras.find((r) => r.nacional);
    const match = matchEspecifico ?? matchNacional;
    const novoEndereco = { ...endereco, cep: cepFormatado, rua: resultado.rua, bairro: resultado.bairro, cidade: resultado.cidade, estado: resultado.estado };
    setEndereco(novoEndereco);

    if (!match) {
      // Só acontece se nem regra específica nem nacional estiverem configuradas — nunca deveria, mas nunca finge que entrega sem regra nenhuma.
      setRegiaoEncontrada(null);
      setCidadeNaoAtendida(true);
      return;
    }
    setRegiaoEncontrada(match);
    setCidadeNaoAtendida(false);
    onSelecionar({ tipo: "entrega", regiaoId: match.id, endereco: novoEndereco });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Como você quer receber</p>

      <button
        type="button"
        onClick={() => { setModoEntrega(false); onSelecionar({ tipo: "retirada" }); }}
        className={cn(
          "flex items-center justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !modoEntrega ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
        )}
      >
        <span className="flex items-center gap-2 text-sm text-foreground"><Store className="h-4 w-4 text-primary" />Retirar na loja</span>
        <span className="text-sm font-semibold text-success-text">Grátis</span>
      </button>

      <button
        type="button" onClick={() => setModoEntrega(true)}
        className={cn(
          "flex items-center justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          modoEntrega ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
        )}
      >
        <span className="flex items-center gap-2 text-sm text-foreground"><Truck className="h-4 w-4 text-primary" />Entrega — informar endereço</span>
        {regiaoEncontrada && <span className="text-sm font-semibold text-foreground">{regiaoEncontrada.valor > 0 ? formatCurrency(regiaoEncontrada.valor) : "Grátis"}</span>}
      </button>

      {modoEntrega && (
        <div className="flex flex-col gap-2 rounded-xl border border-black/[0.08] p-3">
          <div className="relative">
            <Input placeholder="CEP" value={endereco.cep} onChange={(e) => void handleCepChange(e.target.value)} maxLength={8} className="h-9 text-sm" />
            {buscando && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {erroCep && <p className="text-xs text-danger">{erroCep}</p>}
          {cidadeNaoAtendida && !erroCep && (
            <p className="text-xs text-warning-text">Ainda não entregamos em {endereco.cidade || "essa cidade"} — escolhe retirar na loja, ou fala com a gente no WhatsApp.</p>
          )}

          {regiaoEncontrada && (
            <>
              <Input placeholder="Rua" value={endereco.rua} onChange={(e) => atualizarEndereco({ rua: e.target.value })} className="h-9 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Número" value={endereco.numero} onChange={(e) => atualizarEndereco({ numero: e.target.value })} className="h-9 text-sm" />
                <Input placeholder="Complemento (opcional)" value={endereco.complemento} onChange={(e) => atualizarEndereco({ complemento: e.target.value })} className="h-9 text-sm" />
              </div>
              <Input placeholder="Bairro" value={endereco.bairro} onChange={(e) => atualizarEndereco({ bairro: e.target.value })} className="h-9 text-sm" />
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <Input placeholder="Cidade" value={endereco.cidade} disabled className="h-9 text-sm bg-secondary/40" />
                <Input placeholder="UF" value={endereco.estado} disabled className="h-9 text-sm bg-secondary/40" />
              </div>
              <p className="text-[11px] text-muted-foreground">Prazo estimado: {regiaoEncontrada.prazo_dias_uteis} dia{regiaoEncontrada.prazo_dias_uteis !== 1 ? "s" : ""} útil{regiaoEncontrada.prazo_dias_uteis !== 1 ? "eis" : ""}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
