"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react";

export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [indice, setIndice] = useState(0);

  // Sempre que o array de fotos mudar (troca de unidade/cor
  // selecionada), volta pra primeira foto — evita ficar "preso" num
  // índice que não existe mais no novo conjunto.
  const indiceSeguro = indice < fotos.length ? indice : 0;

  function anterior() {
    setIndice((i) => (i === 0 ? fotos.length - 1 : i - 1));
  }
  function proxima() {
    setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAFBFC] to-[#F0F2F6]">
        {fotos[indiceSeguro] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotos[indiceSeguro]} alt={alt} className="h-full w-full object-contain" />
        ) : (
          <Smartphone className="h-32 w-32 text-black/[0.08]" strokeWidth={0.75} />
        )}

        {fotos.length > 1 && (
          <>
            <button
              type="button" onClick={anterior}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md hover:bg-white"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button" onClick={proxima}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md hover:bg-white"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {fotos.map((_, i) => (
            <button
              key={i} type="button" onClick={() => setIndice(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === indiceSeguro ? "w-5 bg-primary" : "w-1.5 bg-black/15"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
