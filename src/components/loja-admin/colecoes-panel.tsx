"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { criarColecaoAction, removerColecaoAction } from "@/services/loja-admin/central-loja.actions";
import type { Colecao } from "@/types";

export function ColecoesPanel({ colecoes }: { colecoes: Colecao[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleAdicionar() {
    setErro(null);
    if (!nome.trim()) return;
    startTransition(async () => {
      const result = await criarColecaoAction({ nome: nome.trim(), descricao: descricao.trim() || undefined });
      if (!result.success) return setErro(result.error);
      setNome(""); setDescricao("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input placeholder="Nome da coleção (ex: Ofertas de Verão)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Button onClick={handleAdicionar} disabled={isPending}><Plus className="h-4 w-4" />Criar</Button>
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex flex-col gap-2">
        {colecoes.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{c.nome}</p>
                {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => startTransition(async () => { await removerColecaoAction(c.id); router.refresh(); })}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {colecoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma coleção criada ainda.</p>}
      </div>
    </div>
  );
}
