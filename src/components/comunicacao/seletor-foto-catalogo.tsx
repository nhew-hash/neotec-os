"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Image as ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buscarFotosCatalogoAction } from "@/services/catalogo-fotos/catalogo-fotos.actions";
import { enviarFotoCatalogoAction } from "@/services/whatsapp/whatsapp.actions";

interface FotoResultado {
  id: string;
  descricao: string;
  url: string;
}

export function SeletorFotoCatalogo({ conversaId, telefone, aberto: abertoFora, onAbertoChange, classeBotao }: {
  conversaId: string;
  telefone: string;
  /** Aberto por fora (menu "+" do celular). */
  aberto?: boolean;
  onAbertoChange?: (v: boolean) => void;
  classeBotao?: string;
}) {
  const [abertoInterno, setAbertoInterno] = useState(false);
  const aberto = abertoFora ?? abertoInterno;
  const setAberto = (v: boolean | ((x: boolean) => boolean)) => {
    const novo = typeof v === "function" ? v(aberto) : v;
    if (onAbertoChange) onAbertoChange(novo); else setAbertoInterno(novo);
  };
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<FotoResultado[]>([]);
  const [isPending, startTransition] = useTransition();
  const [enviando, setEnviando] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  useEffect(() => {
    if (!termo.trim()) return setResultados([]);
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const result = await buscarFotosCatalogoAction(termo);
        setResultados(result.success ? result.data : []);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [termo]);

  function handleEnviar(foto: FotoResultado) {
    setEnviando(foto.id);
    setErroEnvio(null);
    startTransition(async () => {
      const r = await enviarFotoCatalogoAction(conversaId, telefone, foto.url);
      setEnviando(null);
      // Antes o resultado era ignorado: a janela fechava como se tivesse enviado.
      if (!r.success) return setErroEnvio(r.error);
      setAberto(false);
      setTermo("");
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="ghost" size="icon" className={classeBotao} onClick={() => setAberto((v) => !v)} title="Enviar foto do catálogo" aria-label="Enviar foto do catálogo">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      </Button>

      {aberto && (
        <div className={cn("absolute bottom-full left-0 z-50 mb-2 w-72 animate-fade-in rounded-card border border-border bg-card p-2 shadow-popover")}>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Ex: 13 preto seminovo"
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>

          {erroEnvio && <p role="alert" className="mb-2 rounded bg-danger-soft px-2 py-1.5 text-xs text-danger">{erroEnvio}</p>}
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {isPending && <p className="py-4 text-center text-xs text-muted-foreground">Buscando...</p>}
            {!isPending && termo.trim() && resultados.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma foto encontrada no catálogo.</p>
            )}
            {resultados.map((foto) => (
              <button
                key={foto.id}
                type="button"
                onClick={() => handleEnviar(foto)}
                disabled={enviando === foto.id}
                className="flex items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt={foto.descricao} className="h-10 w-10 rounded object-cover" />
                <span className="text-xs text-foreground">{enviando === foto.id ? "Enviando..." : foto.descricao}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
