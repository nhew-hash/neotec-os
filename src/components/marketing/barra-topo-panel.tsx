"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemArrastavel } from "@/components/loja-cms/item-arrastavel";
import {
  criarBarraTopoItemAction, atualizarBarraTopoItemAction, removerBarraTopoItemAction, reordenarBarraTopoItensAction,
} from "@/services/marketing/marketing.actions";
import type { BarraTopoItem } from "@/types";

function ItemForm({ item }: { item: BarraTopoItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function salvar(input: Partial<Pick<BarraTopoItem, "texto" | "icone" | "ativo">>) {
    startTransition(async () => {
      await atualizarBarraTopoItemAction(item.id, input);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input defaultValue={item.icone ?? ""} placeholder="🚚" className="w-14" onBlur={(e) => salvar({ icone: e.target.value })} />
      <Input defaultValue={item.texto} placeholder="Texto" className="flex-1" onBlur={(e) => salvar({ texto: e.target.value })} />
      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
        <input type="checkbox" checked={item.ativo} onChange={(e) => salvar({ ativo: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
        Ativo
      </label>
      <Button
        type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}
        onClick={() => startTransition(async () => { await removerBarraTopoItemAction(item.id); router.refresh(); })}
      >
        <Trash2 className="h-3.5 w-3.5 text-danger" />
      </Button>
    </div>
  );
}

export function BarraTopoPanel({ itens: itensIniciais }: { itens: BarraTopoItem[] }) {
  const router = useRouter();
  const [itens, setItens] = useState(itensIniciais);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itens.findIndex((i) => i.id === active.id);
    const newIndex = itens.findIndex((i) => i.id === over.id);
    const novaOrdem = arrayMove(itens, oldIndex, newIndex);
    setItens(novaOrdem);
    startTransition(async () => { await reordenarBarraTopoItensAction(novaOrdem.map((i) => i.id)); });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Barra superior rotativa</CardTitle>
        <Button
          size="sm" variant="outline" disabled={isPending}
          onClick={() => startTransition(async () => { await criarBarraTopoItemAction(); router.refresh(); })}
        >
          <Plus className="h-3.5 w-3.5" />Novo item
        </Button>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {itens.map((item) => (
                  <ItemArrastavel key={item.id} id={item.id}>
                    <ItemForm item={item} />
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
