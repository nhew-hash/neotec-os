"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemArrastavel } from "./item-arrastavel";
import {
  criarHeroSlideAction, atualizarHeroSlideAction, removerHeroSlideAction,
  reordenarHeroSlidesAction, uploadImagemHeroAction,
} from "@/services/loja/home-cms.actions";
import type { HeroSlide } from "@/types";

function formatarDataInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

function SlideForm({ slide }: { slide: HeroSlide }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enviandoDesktop, setEnviandoDesktop] = useState(false);
  const [enviandoMobile, setEnviandoMobile] = useState(false);

  function salvar(campo: keyof HeroSlide, valor: string | boolean | null) {
    startTransition(async () => {
      await atualizarHeroSlideAction(slide.id, { [campo]: valor });
      router.refresh();
    });
  }

  async function handleUpload(arquivo: File, tipo: "desktop" | "mobile") {
    const setLoading = tipo === "desktop" ? setEnviandoDesktop : setEnviandoMobile;
    setLoading(true);
    const formData = new FormData();
    formData.set("arquivo", arquivo);
    const result = await uploadImagemHeroAction(formData);
    setLoading(false);
    if (result.success) {
      salvar(tipo === "desktop" ? "imagem_desktop_url" : "imagem_mobile_url", result.data.url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{slide.ativo ? "Ativo" : "Inativo"}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={slide.ativo} onChange={(e) => salvar("ativo", e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
            Ativo
          </label>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startTransition(async () => { await removerHeroSlideAction(slide.id); router.refresh(); })} disabled={isPending}>
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      </div>

      <Input defaultValue={slide.titulo} placeholder="Título" onBlur={(e) => salvar("titulo", e.target.value)} />
      <Input defaultValue={slide.subtitulo ?? ""} placeholder="Subtítulo" onBlur={(e) => salvar("subtitulo", e.target.value)} />
      <div className="flex gap-2">
        <Input defaultValue={slide.texto_botao ?? ""} placeholder="Texto do botão" onBlur={(e) => salvar("texto_botao", e.target.value)} />
        <Input defaultValue={slide.link_botao ?? ""} placeholder="Link (ex: /loja/categoria/iphone)" onBlur={(e) => salvar("link_botao", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Imagem desktop</label>
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/40">
            <Upload className="h-3.5 w-3.5" />{enviandoDesktop ? "Enviando..." : slide.imagem_desktop_url ? "Trocar imagem" : "Enviar imagem"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "desktop")} />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Imagem mobile</label>
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/40">
            <Upload className="h-3.5 w-3.5" />{enviandoMobile ? "Enviando..." : slide.imagem_mobile_url ? "Trocar imagem" : "Enviar imagem"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "mobile")} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Ativa a partir de</label>
          <Input type="datetime-local" defaultValue={formatarDataInput(slide.data_inicio)} onBlur={(e) => salvar("data_inicio", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted-foreground">Ativa até</label>
          <Input type="datetime-local" defaultValue={formatarDataInput(slide.data_fim)} onBlur={(e) => salvar("data_fim", e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </div>
      </div>
    </div>
  );
}

export function HeroSlidesPanel({ slides: slidesIniciais }: { slides: HeroSlide[] }) {
  const router = useRouter();
  const [slides, setSlides] = useState(slidesIniciais);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const novaOrdem = arrayMove(slides, oldIndex, newIndex);
    setSlides(novaOrdem);
    startTransition(async () => {
      await reordenarHeroSlidesAction(novaOrdem.map((s) => s.id));
    });
  }

  function handleAdicionar() {
    startTransition(async () => {
      await criarHeroSlideAction();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hero Slider</CardTitle>
        <Button size="sm" variant="outline" onClick={handleAdicionar} disabled={isPending}>
          <Plus className="h-3.5 w-3.5" />Novo slide
        </Button>
      </CardHeader>
      <CardContent>
        {slides.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum slide cadastrado.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {slides.map((slide) => (
                  <ItemArrastavel key={slide.id} id={slide.id}>
                    <SlideForm slide={slide} />
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
