"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemArrastavel } from "./item-arrastavel";
import { SecaoConfigForm } from "./secao-config-form";
import {
  criarHomeSecaoAction, atualizarHomeSecaoAction, removerHomeSecaoAction, reordenarHomeSecoesAction,
} from "@/services/loja/home-cms.actions";
import type { HomeSecao, TipoSecaoHome } from "@/types";

const TIPOS_SECAO: { valor: TipoSecaoHome; label: string }[] = [
  { valor: "banner", label: "Banner" },
  { valor: "vitrine_produtos", label: "Vitrine de produtos" },
  { valor: "categorias", label: "Categorias" },
  { valor: "trade_in", label: "Trade-in" },
  { valor: "assistencia", label: "Assistência / Diferenciais" },
  { valor: "avaliacoes", label: "Avaliações" },
  { valor: "video", label: "Vídeo" },
  { valor: "instagram", label: "Instagram" },
  { valor: "texto", label: "Texto" },
];

function formatarDataInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

function SecaoItem({ secao }: { secao: HomeSecao }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function salvar(input: Partial<Pick<HomeSecao, "ativo" | "configuracao" | "data_inicio" | "data_fim">>) {
    startTransition(async () => {
      await atualizarHomeSecaoAction(secao.id, input);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TIPOS_SECAO.find((t) => t.valor === secao.tipo)?.label ?? secao.tipo}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={secao.ativo} onChange={(e) => salvar({ ativo: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
            Ativo
          </label>
          <Button
            type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}
            onClick={() => startTransition(async () => { await removerHomeSecaoAction(secao.id); router.refresh(); })}
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      </div>

      <SecaoConfigForm tipo={secao.tipo} configuracao={secao.configuracao} onChange={(config) => salvar({ configuracao: config })} />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Ativa a partir de (opcional)</label>
          <Input type="datetime-local" defaultValue={formatarDataInput(secao.data_inicio)} onBlur={(e) => salvar({ data_inicio: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Ativa até (opcional — campanha sazonal)</label>
          <Input type="datetime-local" defaultValue={formatarDataInput(secao.data_fim)} onBlur={(e) => salvar({ data_fim: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
      </div>
    </div>
  );
}

export function HomeSecoesPanel({ secoes: secoesIniciais }: { secoes: HomeSecao[] }) {
  const router = useRouter();
  const [secoes, setSecoes] = useState(secoesIniciais);
  const [novoTipo, setNovoTipo] = useState<TipoSecaoHome>("banner");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = secoes.findIndex((s) => s.id === active.id);
    const newIndex = secoes.findIndex((s) => s.id === over.id);
    const novaOrdem = arrayMove(secoes, oldIndex, newIndex);
    setSecoes(novaOrdem);
    startTransition(async () => {
      await reordenarHomeSecoesAction(novaOrdem.map((s) => s.id));
    });
  }

  function handleAdicionar() {
    startTransition(async () => {
      await criarHomeSecaoAction(novoTipo);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Seções da Home</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as TipoSecaoHome)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_SECAO.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleAdicionar} disabled={isPending}>
            <Plus className="h-3.5 w-3.5" />Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Arraste pelo ícone à esquerda pra reordenar. "Ativa até" é o campo pra campanha sazonal — a seção some sozinha na data, sem precisar mexer em nada.
        </p>
        {secoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma seção cadastrada.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={secoes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {secoes.map((secao) => (
                  <ItemArrastavel key={secao.id} id={secao.id}>
                    <SecaoItem secao={secao} />
                  </ItemArrastavel>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
