"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Keyboard, ScanLine, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelarCapturaAction, concluirCapturaAction, type CapturaDetalhe } from "@/services/celular/celular.actions";
import { ROTULO_CONTEXTO } from "@/services/celular/captura";
import { normalizarImei } from "@/services/push/push";
import { subirFotos } from "./fotos-upload";
import { LeitorImei } from "./leitor-imei";

/**
 * Tela que abre no celular ao tocar na notificação "Tirar fotos / Ler IMEI".
 * As fotos sobem direto para o armazenamento privado; ao concluir, aparecem
 * na tela do computador (que fica conferindo o pedido).
 */
export function CapturaCelular({ captura }: { captura: CapturaDetalhe }) {
  const [arquivos, setArquivos] = useState<{ arquivo: File; previa: string }[]>([]);
  const [imei, setImei] = useState("");
  const [modoImei, setModoImei] = useState<"camera" | "digitar">("camera");
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<{ aviso: string | null } | null>(null);
  const [pendente, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const titulo = captura.tipo === "fotos" ? "Fotos do aparelho" : "IMEI do aparelho";
  const contexto = `${ROTULO_CONTEXTO[captura.contextoTipo]}${captura.rotulo ? ` — ${captura.rotulo}` : ""}`;

  if (captura.status !== "pendente" || captura.expirada) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="font-medium">{captura.status === "concluida" ? "Este pedido já foi concluído." : captura.status === "cancelada" ? "Este pedido foi cancelado no computador." : "Este pedido venceu (2 horas). Peça de novo no computador."}</p>
        <Link href={captura.voltarPara} className={buttonVariants({ variant: "outline" })}>Abrir o registro</Link>
      </div>
    );
  }

  if (concluido) {
    return (
      <div className="space-y-3 rounded-xl border border-success/40 bg-success-soft/40 p-4" role="status">
        <p className="flex items-center gap-2 font-medium text-success-text"><CheckCircle2 className="h-5 w-5" aria-hidden />Pronto! Já aparece no computador.</p>
        {concluido.aviso && <p className="text-sm text-warning-text">{concluido.aviso}</p>}
        <div className="flex flex-wrap gap-2">
          <Link href={captura.voltarPara} className={buttonVariants({ variant: "outline" })}>Abrir o registro</Link>
          <Link href="/celular" className={buttonVariants({ variant: "ghost" })}>Outros pedidos</Link>
        </div>
      </div>
    );
  }

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos = Array.from(lista).filter((f) => f.type.startsWith("image/")).map((arquivo) => ({ arquivo, previa: URL.createObjectURL(arquivo) }));
    setArquivos((a) => [...a, ...novos].slice(0, 30));
    if (input.current) input.current.value = "";
  }

  function remover(i: number) {
    setArquivos((a) => { URL.revokeObjectURL(a[i].previa); return a.filter((_, idx) => idx !== i); });
  }

  function enviarFotos() {
    setErro(null);
    if (arquivos.length === 0) return setErro("Tire pelo menos uma foto.");
    start(async () => {
      try {
        setProgresso(`Enviando 0 de ${arquivos.length}…`);
        const caminhos = await subirFotos(arquivos.map((a) => a.arquivo), captura.contextoTipo, captura.contextoId, (n) => setProgresso(`Enviando ${n} de ${arquivos.length}…`));
        const r = await concluirCapturaAction(captura.id, { fotos: caminhos });
        setProgresso(null);
        if (!r.success) return setErro(r.error);
        setConcluido({ aviso: r.data.aviso });
      } catch (err) {
        setProgresso(null);
        setErro(err instanceof Error ? err.message : "Não foi possível enviar as fotos.");
      }
    });
  }

  function enviarImei(valor: string) {
    setErro(null);
    const limpo = normalizarImei(valor);
    if (!limpo) return setErro("IMEI inválido: são 15 dígitos e o último confere os outros. Confira e tente de novo.");
    start(async () => {
      const r = await concluirCapturaAction(captura.id, { imei: limpo });
      if (!r.success) return setErro(r.error);
      setConcluido({ aviso: r.data.aviso });
    });
  }

  function cancelar() {
    start(async () => {
      const r = await cancelarCapturaAction(captura.id);
      if (!r.success) return setErro(r.error);
      window.location.href = "/celular";
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{contexto}</p>
      </div>

      {captura.tipo === "fotos" ? (
        <>
          <input ref={input} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => adicionar(e.target.files)} aria-label="Tirar foto" />
          <Button type="button" className="h-14 w-full text-base" onClick={() => input.current?.click()} disabled={pendente}>
            <Camera className="h-5 w-5" aria-hidden />{arquivos.length === 0 ? "Abrir a câmera" : "Tirar mais uma"}
          </Button>
          <p className="text-xs text-muted-foreground">Sugestão: frente, traseira, laterais e o defeito de perto. Até 30 fotos.</p>
          {arquivos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {arquivos.map((a, i) => (
                <li key={a.previa} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.previa} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => remover(i)} disabled={pendente} className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white" aria-label={`Remover foto ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant={arquivos.length > 0 ? "default" : "outline"} className="h-12 w-full" onClick={enviarFotos} disabled={pendente || arquivos.length === 0}>
            {progresso ?? (pendente ? "Enviando…" : `Enviar ${arquivos.length || ""} ${arquivos.length === 1 ? "foto" : "fotos"} para o computador`)}
          </Button>
        </>
      ) : (
        <>
          <div className="flex gap-2" role="tablist">
            <Button type="button" size="sm" variant={modoImei === "camera" ? "default" : "outline"} onClick={() => setModoImei("camera")} role="tab" aria-selected={modoImei === "camera"}><ScanLine className="h-4 w-4" />Ler código</Button>
            <Button type="button" size="sm" variant={modoImei === "digitar" ? "default" : "outline"} onClick={() => setModoImei("digitar")} role="tab" aria-selected={modoImei === "digitar"}><Keyboard className="h-4 w-4" />Digitar</Button>
          </div>
          {modoImei === "camera" ? (
            imei ? (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">IMEI lido</p>
                <p className="font-mono text-2xl tracking-wider">{imei}</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => enviarImei(imei)} disabled={pendente}>{pendente ? "Enviando…" : "Confirmar e enviar"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setImei("")} disabled={pendente}>Ler de novo</Button>
                </div>
              </div>
            ) : (
              <LeitorImei onLido={setImei} />
            )
          ) : (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); enviarImei(imei); }}>
              <Input value={imei} onChange={(e) => setImei(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="15 dígitos (*#06#)" className="h-12 font-mono text-lg" aria-label="IMEI" />
              <Button type="submit" className="h-12" disabled={pendente}>Enviar</Button>
            </form>
          )}
        </>
      )}

      {erro && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      <button type="button" onClick={cancelar} disabled={pendente} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><X className="h-4 w-4" aria-hidden />Cancelar pedido</button>
    </div>
  );
}
