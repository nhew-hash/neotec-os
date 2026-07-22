"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFotoCatalogoAction, removerFotoCatalogoAction } from "@/services/catalogo-fotos/catalogo-fotos.actions";
import type { CatalogoFoto } from "@/types";

export function CatalogoFotosPanel({ fotos }: { fotos: (CatalogoFoto & { url: string })[] }) {
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  function handleUpload(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await uploadFotoCatalogoAction(formData);
      if (!result.success) return setErro(result.error);
      setDescricao("");
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    });
  }

  function handleRemover(id: string) {
    startTransition(() => { void removerFotoCatalogoAction(id); });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-4">
          <form action={handleUpload} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Descrição (ex: iPhone 13 Preto Seminovo)</label>
              <Input name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Foto</label>
              <Input ref={inputArquivoRef} name="foto" type="file" accept="image/*" required className="w-56" />
            </div>
            <Button type="submit" disabled={isPending}>
              <Upload className="h-4 w-4" />{isPending ? "Enviando..." : "Adicionar ao catálogo"}
            </Button>
          </form>
          {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
        </CardContent>
      </Card>

      {fotos.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma foto cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {fotos.map((foto) => (
            <Card key={foto.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.descricao} className="h-32 w-full object-cover" />
              <CardContent className="flex flex-col gap-1.5 p-2.5">
                <span className="line-clamp-2 text-xs text-foreground">{foto.descricao}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemover(foto.id)} disabled={isPending} className="self-end text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
