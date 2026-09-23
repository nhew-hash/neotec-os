"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, AlertTriangle, ImageOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarPendenciasAction, listarGruposAction, vincularManualmenteAction } from "@/services/banco-imagens/banco-imagens.actions";
import type { GrupoListado, ItemAmbiguo, ItemPendente } from "@/services/banco-imagens/banco-imagens.service";

const TIPO_LABEL: Record<string, string> = { produto: "Produto", aparelho: "Aparelho (seminovo)", lacrado: "Lacrado" };

function SeletorGrupo({ opcoes, onEscolher, disabled }: { opcoes: GrupoListado[]; onEscolher: (grupoId: string) => void; disabled: boolean }) {
  return (
    <Select onValueChange={onEscolher} disabled={disabled}>
      <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Escolher grupo..." /></SelectTrigger>
      <SelectContent>
        {opcoes.map((g) => (
          <SelectItem key={g.id} value={g.id}>{g.marca} {g.modelo}{g.cor ? ` — ${g.cor}` : ""}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PendenciasPanel() {
  const [ambiguos, setAmbiguos] = useState<ItemAmbiguo[]>([]);
  const [semGrupo, setSemGrupo] = useState<ItemPendente[]>([]);
  const [grupos, setGrupos] = useState<GrupoListado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vinculando, startVincular] = useTransition();
  const [itemVinculadoOk, setItemVinculadoOk] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    const [pendencias, todosOsGrupos] = await Promise.all([listarPendenciasAction(), listarGruposAction()]);
    setCarregando(false);
    if (!pendencias.success) return setErro(pendencias.error);
    setAmbiguos(pendencias.data.ambiguos);
    setSemGrupo(pendencias.data.semGrupo);
    if (todosOsGrupos.success) setGrupos(todosOsGrupos.data);
  }

  useEffect(() => { carregar(); }, []);

  function grupoLabel(id: string): string {
    const g = grupos.find((x) => x.id === id);
    return g ? `${g.marca} ${g.modelo}${g.cor ? ` — ${g.cor}` : ""}` : id;
  }

  function handleVincular(item: ItemPendente, grupoId: string) {
    startVincular(async () => {
      const result = await vincularManualmenteAction(item.tipo, item.id, grupoId);
      if (result.success) {
        setItemVinculadoOk(`${item.tipo}-${item.id}`);
        setAmbiguos((a) => a.filter((x) => !(x.tipo === item.tipo && x.id === item.id)));
        setSemGrupo((s) => s.filter((x) => !(x.tipo === item.tipo && x.id === item.id)));
      }
    });
  }

  if (carregando) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Verificando pendências...</div>;
  }

  if (erro) return <p className="text-sm text-danger">{erro}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Recalculado na hora — nada aqui é gravado até você escolher um grupo.</p>
        <Button size="sm" variant="outline" onClick={carregar}><RefreshCw className="h-3.5 w-3.5" />Atualizar</Button>
      </div>

      <section className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><AlertTriangle className="h-4 w-4 text-warning" />Ambíguos ({ambiguos.length})</p>
        <p className="text-xs text-muted-foreground">A cor do estoque bateu com mais de um grupo de foto — escolha manualmente o certo.</p>
        {ambiguos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum item ambíguo agora.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ambiguos.map((item) => (
              <li key={`${item.tipo}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-[10px]">{TIPO_LABEL[item.tipo]}</Badge>
                  <span className="text-foreground">{item.nome}{item.cor ? ` — ${item.cor}` : ""}</span>
                  <span className="text-muted-foreground">candidatos: {item.candidatos.map(grupoLabel).join(" · ")}</span>
                </div>
                {itemVinculadoOk === `${item.tipo}-${item.id}` ? (
                  <Badge variant="success" className="text-[10px]">Vinculado!</Badge>
                ) : (
                  <SeletorGrupo opcoes={grupos.filter((g) => item.candidatos.includes(g.id))} onEscolher={(grupoId) => handleVincular(item, grupoId)} disabled={vinculando} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><ImageOff className="h-4 w-4 text-muted-foreground" />Sem foto ({semGrupo.length})</p>
        <p className="text-xs text-muted-foreground">Não bateu com nenhum grupo do banco de imagens — vincula manualmente se souber qual é.</p>
        {semGrupo.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nada pendente — tudo que tem grupo compatível já está vinculado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {semGrupo.map((item) => (
              <li key={`${item.tipo}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-[10px]">{TIPO_LABEL[item.tipo]}</Badge>
                  <span className="text-foreground">{item.nome}{item.cor ? ` — ${item.cor}` : ""}</span>
                </div>
                {itemVinculadoOk === `${item.tipo}-${item.id}` ? (
                  <Badge variant="success" className="text-[10px]">Vinculado!</Badge>
                ) : (
                  <SeletorGrupo opcoes={grupos} onEscolher={(grupoId) => handleVincular(item, grupoId)} disabled={vinculando} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
