"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ItemArrastavel } from "@/components/loja-cms/item-arrastavel";
import { obterDetalheGrupoAction, atualizarEquivalentesAction, reordenarFotosAction } from "@/services/banco-imagens/banco-imagens.actions";
import type { DetalheGrupo, FotoDetalhe } from "@/services/banco-imagens/banco-imagens.service";

function FotoCard({ foto, capa }: { foto: FotoDetalhe; capa: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col gap-0.5">
        {capa && <Badge className="w-fit text-[10px]">Capa</Badge>}
        <span className="text-xs text-muted-foreground">tipo: {foto.tipo}</span>
      </div>
    </div>
  );
}

export function DetalheGrupoDialog({ grupoId, onClose, onAtualizado }: { grupoId: string; onClose: () => void; onAtualizado: () => void }) {
  const [detalhe, setDetalhe] = useState<DetalheGrupo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [coresTexto, setCoresTexto] = useState("");
  const [modelosTexto, setModelosTexto] = useState("");
  const [salvando, startSalvar] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    obterDetalheGrupoAction(grupoId).then((r) => {
      if (!r.success) return setErro(r.error);
      if (!r.data) return setErro("Grupo não encontrado.");
      setDetalhe(r.data);
      setCoresTexto(r.data.coresEquivalentes.join(", "));
      setModelosTexto(r.data.modelosEquivalentes.join(", "));
    });
  }, [grupoId]);

  function handleDragEnd(event: DragEndEvent) {
    if (!detalhe) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = detalhe.fotos.findIndex((f) => f.id === active.id);
    const newIndex = detalhe.fotos.findIndex((f) => f.id === over.id);
    const novaOrdem = arrayMove(detalhe.fotos, oldIndex, newIndex);
    setDetalhe({ ...detalhe, fotos: novaOrdem });
    startSalvar(async () => {
      await reordenarFotosAction(grupoId, novaOrdem.map((f) => f.id));
      onAtualizado();
    });
  }

  function handleSalvarEquivalentes() {
    const cores = coresTexto.split(",").map((s) => s.trim()).filter(Boolean);
    const modelos = modelosTexto.split(",").map((s) => s.trim()).filter(Boolean);
    startSalvar(async () => {
      const result = await atualizarEquivalentesAction(grupoId, cores, modelos);
      if (result.success) onAtualizado();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {!detalhe && !erro && <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</div>}

        {detalhe && (
          <>
            <DialogHeader>
              <DialogTitle>{detalhe.marca} {detalhe.modelo}{detalhe.cor && ` — ${detalhe.cor}`}</DialogTitle>
              <DialogDescription>
                {detalhe.categoria && `${detalhe.categoria} · `}
                {detalhe.classificacao}
                {detalhe.observacao && <span className="mt-1 block text-warning">⚠ {detalhe.observacao}</span>}
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fotos (arraste pra reordenar — a primeira é a capa)</p>
                {detalhe.fotos.length === 0 ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><ImageOff className="h-3.5 w-3.5" />Nenhuma foto ainda.</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={detalhe.fotos.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2">
                        {detalhe.fotos.map((f, i) => (
                          <ItemArrastavel key={f.id} id={f.id}>
                            <FotoCard foto={f} capa={i === 0} />
                          </ItemArrastavel>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cores equivalentes (nomes alternativos usados no estoque, separados por vírgula)</p>
                <Textarea value={coresTexto} onChange={(e) => setCoresTexto(e.target.value)} placeholder="ex: Branco, Branco/Prata, Starlight" rows={2} />
              </section>

              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modelos equivalentes (nomes alternativos do modelo, separados por vírgula)</p>
                <Textarea value={modelosTexto} onChange={(e) => setModelosTexto(e.target.value)} placeholder="ex: Fursan Unlimited, Redmi Pad 2" rows={2} />
              </section>

              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vinculado a ({detalhe.vinculos.length})</p>
                {detalhe.vinculos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum item do estoque vinculado ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {detalhe.vinculos.map((v) => (
                      <li key={`${v.tipo}-${v.id}`} className="flex items-center gap-2 text-xs text-foreground">
                        <Badge variant="secondary" className="text-[10px]">{v.tipo}</Badge>{v.nome}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button onClick={handleSalvarEquivalentes} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar equivalentes"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
