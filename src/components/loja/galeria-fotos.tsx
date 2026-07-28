"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react";

const INTERVALO_AUTO_TROCA_MS = 4000;

export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Sempre que o array de fotos mudar (troca de unidade/cor
  // selecionada), volta pra primeira foto — evita ficar "preso" num
  // índice que não existe mais no novo conjunto.
  const indiceSeguro = indice < fotos.length ? indice : 0;

  useEffect(() => {
    setIndice(0);
  }, [fotos]);

  // Troca sozinha enquanto a pessoa está olhando o produto — pausa se
  // ela mexer manualmente (seta ou bolinha), assim não briga com a
  // navegação manual do cliente.
  useEffect(() => {
    if (fotos.length <= 1 || pausado) return;
    const timer = setInterval(() => {
      setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1));
    }, INTERVALO_AUTO_TROCA_MS);
    return () => clearInterval(timer);
  }, [fotos.length, pausado]);

  function anterior() {
    setPausado(true);
    setIndice((i) => (i === 0 ? fotos.length - 1 : i - 1));
  }
  function proxima() {
    setPausado(true);
    setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1));
  }
  function irPara(i: number) {
    setPausado(true);
    setIndice(i);
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
              key={i} type="button" onClick={() => irPara(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === indiceSeguro ? "w-5 bg-primary" : "w-1.5 bg-black/15"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
