"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { ehTelaCheiaNoCelular } from "@/components/layout/ocultar-em-tela-cheia";
import { appInstalado, ehIOS, inscricaoAtual } from "./push-cliente";

type Aviso = "instalar_ios" | "ativar" | null;
const CHAVE = "neotec:aviso-app-dispensado";

/**
 * Lembrete no celular (flutua acima da barra inferior, não empurra a tela):
 * iPhone fora do app instalado → instalar; app sem notificação → ativar.
 * "Agora não" esconde por 3 dias neste aparelho.
 */
export function AvisoAppCelular() {
  const pathname = usePathname();
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let dispensadoAte = 0;
    try { dispensadoAte = Number(localStorage.getItem(CHAVE) ?? 0); } catch { /* sem armazenamento local: mostra */ }
    if (Date.now() < dispensadoAte) return;
    if (ehIOS() && !appInstalado()) { setAviso("instalar_ios"); return; }
    if (!("Notification" in window) || !("PushManager" in window) || Notification.permission === "denied") return;
    inscricaoAtual()
      .then((sub) => { if (!sub) setAviso("ativar"); })
      .catch((err) => console.error("Não foi possível ver as notificações deste aparelho:", err));
  }, []);

  if (!aviso || pathname.startsWith("/celular") || ehTelaCheiaNoCelular(pathname)) return null;

  function dispensar() {
    try { localStorage.setItem(CHAVE, String(Date.now() + 3 * 24 * 3600_000)); } catch { /* sem armazenamento local */ }
    setAviso(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg md:hidden" role="status">
      <Bell className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <Link href="/celular" className="flex-1 text-sm">
        <span className="block font-medium">{aviso === "instalar_ios" ? "Instale o app no iPhone" : "Ative as notificações"}</span>
        <span className="block text-xs text-muted-foreground">{aviso === "instalar_ios" ? "Só assim chegam avisos com o app fechado. Toque para ver como." : "Receba mensagens e retornos com o app fechado."}</span>
      </Link>
      <button type="button" onClick={dispensar} className="rounded p-1 text-muted-foreground" aria-label="Agora não"><X className="h-4 w-4" /></button>
    </div>
  );
}
