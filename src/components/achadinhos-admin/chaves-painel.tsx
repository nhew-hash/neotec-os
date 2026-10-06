"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ChaveApiAchadinho, Escopo } from "@/lib/achadinhos/tipos";
import { criarChaveAction, revogarChaveAction } from "@/services/achadinhos/achadinhos.actions";

const ESCOPOS: { id: Escopo; rotulo: string; dica: string; fixo?: boolean }[] = [
  { id: "leitura", rotulo: "Ver produtos", dica: "Consultar, listar e ver o resumo", fixo: true },
  { id: "escrita", rotulo: "Criar e editar", dica: "Cria rascunhos e edita dados" },
  { id: "status", rotulo: "Ativar, pausar e arquivar", dica: "Decide o que aparece no site" },
  { id: "excluir", rotulo: "Excluir", dica: "Exclusão lógica, exige confirmação por produto" },
];

const data = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");

export function ChavesPainel({ chaves, site }: { chaves: ChaveApiAchadinho[]; site: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [escopos, setEscopos] = useState<Escopo[]>(["leitura", "escrita"]);
  const [nova, setNova] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  const alternar = (e: Escopo) => setEscopos((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]));

  function criar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await criarChaveAction(nome, escopos);
      if (!r.success) return setErro(r.error);
      setNova(r.data.chave);
      setNome("");
      router.refresh();
    });
  }

  function revogar(c: ChaveApiAchadinho) {
    if (!window.confirm(`Revogar a chave “${c.nome}”? Quem usa essa chave perde o acesso na hora.`)) return;
    iniciar(async () => {
      const r = await revogarChaveAction(c.id);
      if (!r.success) setErro(r.error);
      router.refresh();
    });
  }

  async function copiar(t: string) {
    try { await navigator.clipboard.writeText(t); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { setErro("Não deu pra copiar. Selecione o texto e copie manualmente."); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {erro && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

      {nova && (
        <Card className="space-y-3 border-warning/40 bg-warning-soft p-5">
          <p className="font-medium">Copie a chave agora — ela não aparece de novo.</p>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded-md border border-border bg-background px-3 py-2 text-sm">{nova}</code>
            <Button type="button" variant="outline" onClick={() => copiar(nova)}><Copy /> {copiado ? "Copiada" : "Copiar"}</Button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium">Como conectar o Claude</p>
            <p>Endereço MCP: <code>{site}/api/achadinhos/mcp</code></p>
            <p>Cabeçalho: <code>Authorization: Bearer {"<chave>"}</code></p>
            <p>No Claude Code: <code>claude mcp add --transport http achadinhos {site}/api/achadinhos/mcp --header &quot;Authorization: Bearer {"<chave>"}&quot;</code></p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setNova(null)}>Já guardei a chave</Button>
        </Card>
      )}

      <Card className="p-5">
        <form onSubmit={criar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome-chave">Nome da chave</Label>
            <Input id="nome-chave" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Claude no notebook" maxLength={60} required />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">O que o Claude pode fazer</legend>
            {ESCOPOS.map((e) => (
              <label key={e.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={e.fixo || escopos.includes(e.id)} disabled={e.fixo} onChange={() => alternar(e.id)} />
                <span>{e.rotulo} <span className="text-muted-foreground">— {e.dica}</span></span>
              </label>
            ))}
          </fieldset>
          <Button type="submit" loading={pendente}><KeyRound /> Criar chave</Button>
        </form>
      </Card>

      <section className="space-y-2" aria-label="Chaves existentes">
        <h2 className="text-sm font-medium">Chaves criadas</h2>
        {chaves.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma chave ainda.</p>}
        {chaves.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{c.nome} <span className="font-normal text-muted-foreground">({c.prefixo}…)</span></p>
              <p className="text-xs text-muted-foreground">Permissões: {c.escopos.join(", ")} · último uso: {data(c.ultimo_uso_em)} · criada em {data(c.criado_em)}</p>
            </div>
            <div className="flex items-center gap-2">
              {c.revogada_em ? <StatusBadge label="Revogada" tone="neutral" /> : <StatusBadge label="Ativa" tone="success" />}
              {!c.revogada_em && <Button type="button" variant="outline" size="sm" onClick={() => revogar(c)}>Revogar</Button>}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
