"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, MessageCircle, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { itensDoCargo, type SidebarNavItem } from "./nav-items";
import type { CargoUsuario } from "@/types";
import type { LucideIcon } from "lucide-react";

interface Opcao {
  id: string;
  titulo: string;
  detalhe?: string;
  icon: LucideIcon;
  href: string;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Busca de comandos (Ctrl+K / ⌘K): ir para qualquer módulo que o cargo usa,
 * buscar cliente (nome/telefone/CPF/e-mail — mesma busca de /clientes) ou
 * buscar conversa. Não cria um índice novo: só leva para as buscas que já
 * existem, com o termo preenchido.
 */
export function BuscaComandos({ cargo }: { cargo: CargoUsuario }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const podeComercial = ["admin", "gerente", "vendedor"].includes(cargo);
  const opcoes = useMemo<Opcao[]>(() => {
    const t = termo.trim();
    const modulos = itensDoCargo(cargo)
      .filter((i: SidebarNavItem) => !t || normalizar(`${i.label} ${i.descricao ?? ""}`).includes(normalizar(t)))
      .map((i) => ({ id: i.href, titulo: i.label, detalhe: i.descricao, icon: i.icon, href: i.href }));
    if (!t) return modulos;
    const buscas: Opcao[] = [
      { id: "buscar-cliente", titulo: `Buscar cliente “${t}”`, detalhe: "Nome, telefone, CPF ou e-mail", icon: Users, href: `/clientes?busca=${encodeURIComponent(t)}` },
      ...(podeComercial ? [{ id: "buscar-conversa", titulo: `Buscar conversa “${t}”`, detalhe: "Nome ou telefone", icon: MessageCircle, href: `/comunicacao?busca=${encodeURIComponent(t)}` }] : []),
    ];
    return [...buscas, ...modulos];
  }, [termo, cargo, podeComercial]);

  useEffect(() => setSelecionado(0), [termo]);
  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-indice="${selecionado}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selecionado]);

  function ir(opcao: Opcao | undefined) {
    if (!opcao) return;
    setAberto(false);
    setTermo("");
    router.push(opcao.href);
  }

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) setTermo(""); }}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/60 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary sm:w-56"
          aria-label="Buscar (Ctrl+K)"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden flex-1 truncate text-left sm:inline">Buscar…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground lg:inline">Ctrl K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-popover data-[state=open]:animate-fade-in"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelecionado((i) => Math.min(i + 1, opcoes.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSelecionado((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); ir(opcoes[selecionado]); }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Buscar</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Digite para buscar clientes, conversas ou ir para um módulo. Use as setas e Enter.</DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Nome, telefone ou módulo…"
              className="h-12 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded
              aria-controls="busca-comandos-lista"
              aria-activedescendant={opcoes[selecionado] ? `opcao-${opcoes[selecionado].id}` : undefined}
            />
          </div>
          <ul id="busca-comandos-lista" ref={listaRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {opcoes.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</li>}
            {opcoes.map((o, indice) => {
              const Icon = o.icon;
              return (
                <li
                  key={o.id}
                  id={`opcao-${o.id}`}
                  data-indice={indice}
                  role="option"
                  aria-selected={indice === selecionado}
                  onMouseMove={() => setSelecionado(indice)}
                  onClick={() => ir(o)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    indice === selecionado ? "bg-secondary text-foreground" : "text-foreground/90"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.titulo}</span>
                    {o.detalhe && <span className="block truncate text-xs text-muted-foreground">{o.detalhe}</span>}
                  </span>
                  {indice === selecionado && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
