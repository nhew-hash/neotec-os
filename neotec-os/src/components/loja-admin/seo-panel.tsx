"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { atualizarConfigSeoAction } from "@/services/loja-admin/central-loja.actions";
import type { ConfigSeoLoja } from "@/types";

export function SeoPanel({ config }: { config: ConfigSeoLoja }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(config.titulo_padrao ?? "");
  const [descricao, setDescricao] = useState(config.descricao_padrao ?? "");
  const [isPending, startTransition] = useTransition();

  function salvar() {
    startTransition(async () => {
      await atualizarConfigSeoAction({ titulo_padrao: titulo, descricao_padrao: descricao });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Título padrão (aparece no Google e ao compartilhar)</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Neotec — iPhone, Mac, iPad e acessórios em Araguari" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Descrição padrão</label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Loja Neotec: iPhone, iPad, Apple Watch e acessórios, novos e seminovos, com garantia." />
        </div>
        <Button onClick={salvar} disabled={isPending} className="w-fit">{isPending ? "Salvando..." : "Salvar"}</Button>
      </CardContent>
    </Card>
  );
}
