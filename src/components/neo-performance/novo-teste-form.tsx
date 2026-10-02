"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { criarTesteAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function NovoTesteForm() {
  const [isPending, startTransition] = useTransition();
  const [hipotese, setHipotese] = useState("");
  const [variavel, setVariavel] = useState("");
  const [controle, setControle] = useState("");
  const [metrica, setMetrica] = useState("");
  const [duracao, setDuracao] = useState("7");
  const [amostra, setAmostra] = useState("30");
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleCriar() {
    if (!hipotese.trim() || !variavel.trim() || !controle.trim() || !metrica.trim()) return;
    setMensagem(null);
    startTransition(async () => {
      const resultado = await criarTesteAction({
        hipotese: hipotese.trim(),
        variavel: variavel.trim(),
        controle: controle.trim(),
        metrica_principal: metrica.trim(),
        duracao_minima_dias: Number(duracao) || 7,
        amostra_minima: Number(amostra) || 30,
      });
      if (!resultado.success) { setMensagem(resultado.error); return; }
      setHipotese(""); setVariavel(""); setControle(""); setMetrica("");
      setMensagem("Teste criado.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Hipótese" value={hipotese} onChange={(e) => setHipotese(e.target.value)} />
        <Input placeholder="Variável (o que muda)" value={variavel} onChange={(e) => setVariavel(e.target.value)} />
        <Input placeholder="Controle (o que fica igual)" value={controle} onChange={(e) => setControle(e.target.value)} />
        <Input placeholder="Métrica principal" value={metrica} onChange={(e) => setMetrica(e.target.value)} />
        <Input type="number" placeholder="Duração mínima (dias)" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        <Input type="number" placeholder="Amostra mínima" value={amostra} onChange={(e) => setAmostra(e.target.value)} />
      </div>
      <Button size="sm" onClick={handleCriar} disabled={isPending || !hipotese.trim() || !variavel.trim() || !controle.trim() || !metrica.trim()} className="w-fit">
        Criar teste
      </Button>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
