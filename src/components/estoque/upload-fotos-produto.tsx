"use client";

import { useState, useRef } from "react";
import { Upload, X, Star, Loader2 } from "lucide-react";
import { uploadFotoProdutoAction, removerFotoProdutoAction } from "@/services/fotos-produto/fotos-produto.actions";

interface UploadFotosProdutoProps {
  tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos";
  itemId: string;
  fotosIniciais: string[];
}

export function UploadFotosProduto({ tabela, itemId, fotosIniciais }: UploadFotosProdutoProps) {
  const [fotos, setFotos] = useState(fotosIniciais);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleArquivoSelecionado(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);

    const formData = new FormData();
    formData.set("tabela", tabela);
    formData.set("itemId", itemId);
    formData.set("arquivo", arquivo);

    const result = await uploadFotoProdutoAction(formData);
    setEnviando(false);

    if (!result.success) return setErro(result.error);
    setFotos(result.data.fotos);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemover(url: string) {
    setErro(null);
    const fotosAntes = fotos;
    setFotos((prev) => prev.filter((f) => f !== url)); // otimista
    const result = await removerFotoProdutoAction(tabela, itemId, url);
    if (!result.success) {
      setFotos(fotosAntes); // desfaz se der erro
      setErro(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">Fotos reais — a primeira é a capa mostrada na loja</p>

      <div className="flex flex-wrap gap-2">
        {fotos.map((url, i) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                <Star className="h-2.5 w-2.5 fill-current" />Capa
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemover(url)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-[10px]">{enviando ? "Enviando..." : "Adicionar"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            disabled={enviando}
            onChange={(e) => handleArquivoSelecionado(e.target.files?.[0])}
          />
        </label>
      </div>

      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
