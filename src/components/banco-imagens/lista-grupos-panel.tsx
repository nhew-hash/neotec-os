"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ImageOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listarGruposAction, listarCategoriasAction } from "@/services/banco-imagens/banco-imagens.actions";
import type { GrupoListado, FiltrosGrupos } from "@/services/banco-imagens/banco-imagens.service";
import { DetalheGrupoDialog } from "./detalhe-grupo-dialog";

const CLASSIFICACAO_LABEL: Record<string, string> = {
  catalogo: "Catálogo",
  foto_real_terceiros: "Foto real (terceiros)",
  foto_real_neotec: "Foto real (Neotec)",
};

export function ListaGruposPanel() {
  const [grupos, setGrupos] = useState<GrupoListado[] | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosGrupos>({});

  const carregar = useCallback(async (f: FiltrosGrupos) => {
    setCarregando(true);
    setErro(null);
    const result = await listarGruposAction(f);
    setCarregando(false);
    if (!result.success) return setErro(result.error);
    setGrupos(result.data);
  }, []);

  useEffect(() => {
    listarCategoriasAction().then((r) => { if (r.success) setCategorias(r.data); });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => carregar(filtros), 300); // debounce dos campos de texto
    return () => clearTimeout(timeout);
  }, [filtros, carregar]);

  function atualizarFiltro<K extends keyof FiltrosGrupos>(chave: K, valor: FiltrosGrupos[K]) {
    setFiltros((f) => ({ ...f, [chave]: valor || undefined }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Marca..." className="w-36" onChange={(e) => atualizarFiltro("marca", e.target.value)} />
        <Input placeholder="Modelo..." className="w-48" onChange={(e) => atualizarFiltro("modelo", e.target.value)} />
        <Input placeholder="Cor..." className="w-32" onChange={(e) => atualizarFiltro("cor", e.target.value)} />

        <Select onValueChange={(v) => atualizarFiltro("categoria", v === "todas" ? undefined : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => atualizarFiltro("classificacao", v === "todas" ? undefined : (v as FiltrosGrupos["classificacao"]))}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas classificações</SelectItem>
            {Object.entries(CLASSIFICACAO_LABEL).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => atualizarFiltro("comFoto", v === "todos" ? undefined : (v as FiltrosGrupos["comFoto"]))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Foto?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Com ou sem foto</SelectItem>
            <SelectItem value="com">Só com foto</SelectItem>
            <SelectItem value="sem">Só sem foto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      {carregando && !grupos && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando grupos...</div>
      )}

      {grupos && grupos.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum grupo encontrado com esses filtros.</p>
      )}

      {grupos && grupos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {grupos.map((g) => (
            <button
              key={g.id}
              onClick={() => setGrupoSelecionadoId(g.id)}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-popover"
            >
              <div className="flex aspect-square items-center justify-center bg-secondary/40">
                {g.capaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.capaUrl} alt={g.modelo} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-1 p-2.5">
                <p className="truncate text-xs font-medium text-foreground">{g.marca} {g.modelo}</p>
                <p className="truncate text-xs text-muted-foreground">{g.cor ?? "sem cor"}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={g.totalFotos > 0 ? "success" : "danger"} className="text-[10px]">{g.totalFotos} foto(s)</Badge>
                  <Badge variant="secondary" className="text-[10px]">{g.totalVinculos} vínculo(s)</Badge>
                  {g.observacao && <AlertTriangle className="h-3 w-3 text-warning" aria-label={g.observacao} />}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {grupoSelecionadoId && (
        <DetalheGrupoDialog
          grupoId={grupoSelecionadoId}
          onClose={() => setGrupoSelecionadoId(null)}
          onAtualizado={() => carregar(filtros)}
        />
      )}
    </div>
  );
}
