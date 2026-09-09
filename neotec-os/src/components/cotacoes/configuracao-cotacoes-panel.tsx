"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  criarMapeamentoEmojiAction, removerMapeamentoEmojiAction, salvarPrioridadeBuscaAction,
} from "@/services/cotacoes/cotacoes.actions";
import type { MapeamentoEmojiCor, PrioridadeBuscaPreco } from "@/types";

const LABEL_FONTE: Record<string, string> = {
  estoque: "Estoque da loja",
  seminovos: "Seminovos (cotações)",
  lacrados: "Lacrados (cotações)",
  fornecedores: "Fornecedores (cotações gerais)",
};

export function ConfiguracaoCotacoesPanel({
  mapeamento, prioridade,
}: {
  mapeamento: MapeamentoEmojiCor[];
  prioridade: PrioridadeBuscaPreco;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ordem, setOrdem] = useState(prioridade.ordem);

  function handleAdicionarEmoji(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarMapeamentoEmojiAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  function handleRemoverEmoji(id: string) {
    startTransition(() => { void removerMapeamentoEmojiAction(id); });
  }

  function moverItem(index: number, direcao: -1 | 1) {
    const novaOrdem = [...ordem];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= novaOrdem.length) return;
    [novaOrdem[index], novaOrdem[alvo]] = [novaOrdem[alvo], novaOrdem[index]];
    setOrdem(novaOrdem);
    startTransition(() => { void salvarPrioridadeBuscaAction(novaOrdem); });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Prioridade de busca de preço</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Ordem em que o sistema procura preço quando alguém pergunta — usa a primeira fonte que tiver o item, não soma todas.
          </p>
          {ordem.map((fonte, index) => (
            <div key={fonte} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground">{index + 1}. {LABEL_FONTE[fonte] ?? fonte}</span>
              <Button variant="ghost" size="sm" disabled={index === 0 || isPending} onClick={() => moverItem(index, -1)}>↑</Button>
              <Button variant="ghost" size="sm" disabled={index === ordem.length - 1 || isPending} onClick={() => moverItem(index, 1)}>↓</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mapeamento de emoji para cor</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Usado pela IA pra interpretar cor nas mensagens de fornecedor. Cadastre um emoji novo se um fornecedor usar algo fora dessa lista.
          </p>

          <div className="flex flex-col gap-2">
            {mapeamento.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <span className="text-lg">{m.emoji}</span>
                <span className="flex-1 text-sm text-foreground">{m.cor}</span>
                <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleRemoverEmoji(m.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>

          <form action={handleAdicionarEmoji} className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Emoji</label>
              <Input name="emoji" placeholder="🟢" className="w-20" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Cor</label>
              <Input name="cor" placeholder="Verde Meia-noite" />
            </div>
            <Button type="submit" disabled={isPending}>Adicionar</Button>
          </form>

          {erro && <p className="text-xs text-danger">{erro}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
