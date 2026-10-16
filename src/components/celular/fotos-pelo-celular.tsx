"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, ScanLine, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  adicionarFotosAction, cancelarCapturaAction, criarCapturaAction, listarCelularesEquipeAction, listarFotosContextoAction,
  type CelularEquipe, type FotosDoContexto,
} from "@/services/celular/celular.actions";
import type { ContextoCaptura, TipoCaptura } from "@/services/celular/captura";
import { formatDateTime } from "@/utils";
import { subirFotos } from "./fotos-upload";

type Aguardando = { id: string; tipo: TipoCaptura; avisado: boolean; destinoNome?: string | null };

/**
 * Fotos (e IMEI) do aparelho num registro (OS, troca, aparelho):
 * - "pelo celular": o celular da mesma pessoa recebe a notificação, abre a
 *   câmera/leitor e o resultado aparece aqui sozinho (a tela confere a cada 3 s);
 * - "aqui": quando já se está no celular, abre a câmera direto.
 */
export function FotosPeloCelular({ contextoTipo, contextoId, rotulo, lerImei = false, onImeiLido }: {
  contextoTipo: ContextoCaptura;
  contextoId: string;
  rotulo?: string;
  lerImei?: boolean;
  onImeiLido?: (imei: string) => void;
}) {
  const router = useRouter();
  const [dados, setDados] = useState<FotosDoContexto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState<Aguardando | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const imeisConhecidos = useRef<Set<string> | null>(null);
  // De quem é o celular que vai tirar (quem está no computador nem sempre está com o celular).
  const [celulares, setCelulares] = useState<CelularEquipe[] | null>(null);
  const [destinoId, setDestinoId] = useState<string>("");
  useEffect(() => {
    listarCelularesEquipeAction().then((r) => {
      if (!r.success) return setErro(r.error);
      setCelulares(r.data);
      setDestinoId((atual) => atual || r.data[0]?.id || "");
    });
  }, []);

  const carregar = useCallback(async () => {
    const r = await listarFotosContextoAction({ contextoTipo, contextoId });
    if (!r.success) { setErro(r.error); return null; }
    setDados(r.data);
    return r.data;
  }, [contextoTipo, contextoId]);

  useEffect(() => {
    carregar().then((d) => {
      if (!d) return;
      imeisConhecidos.current = new Set(d.imeis.map((i) => `${i.imei}|${i.em}`));
      const p = d.pendentes[0];
      if (p) setAguardando({ id: p.id, tipo: p.tipo, avisado: true });
    });
  }, [carregar]);

  // Confere o pedido enquanto o celular não termina.
  useEffect(() => {
    if (!aguardando) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const d = await carregar();
      if (!d || d.pendentes.some((p) => p.id === aguardando.id)) return;
      setAguardando(null);
      const novo = d.imeis.find((i) => !imeisConhecidos.current?.has(`${i.imei}|${i.em}`));
      imeisConhecidos.current = new Set(d.imeis.map((i) => `${i.imei}|${i.em}`));
      if (novo) onImeiLido?.(novo.imei);
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [aguardando, carregar, onImeiLido, router]);

  function pedir(tipo: TipoCaptura) {
    setErro(null);
    start(async () => {
      const r = await criarCapturaAction({ tipo, contextoTipo, contextoId, rotulo, destinoId: destinoId || undefined });
      if (!r.success) return setErro(r.error);
      setAguardando({ id: r.data.id, tipo, avisado: r.data.avisado, destinoNome: r.data.destinoNome });
    });
  }

  function cancelar() {
    if (!aguardando) return;
    start(async () => {
      const r = await cancelarCapturaAction(aguardando.id);
      if (!r.success) return setErro(r.error);
      setAguardando(null);
    });
  }

  function tirarAqui(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const arquivos = Array.from(lista).slice(0, 30);
    if (input.current) input.current.value = "";
    setErro(null);
    start(async () => {
      try {
        setEnviando(`Enviando 0 de ${arquivos.length}…`);
        const caminhos = await subirFotos(arquivos, contextoTipo, contextoId, (n) => setEnviando(`Enviando ${n} de ${arquivos.length}…`));
        const r = await adicionarFotosAction({ contextoTipo, contextoId, fotos: caminhos, rotulo });
        if (!r.success) return setErro(r.error);
        await carregar();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível enviar as fotos.");
      } finally {
        setEnviando(null);
      }
    });
  }

  const fotos = dados?.fotos ?? [];

  return (
    <div className="flex flex-col gap-3">
      {aguardando ? (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm" role="status">
          <p className="flex items-center gap-2 font-medium"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {aguardando.tipo === "fotos" ? "Aguardando as fotos do celular…" : "Aguardando o IMEI do celular…"}
          </p>
          {aguardando.avisado ? (
            <p className="text-xs text-muted-foreground">Notificação enviada para o celular {aguardando.destinoNome ? `de ${aguardando.destinoNome}` : "da sua conta"}. É só tocar nela para abrir a câmera.</p>
          ) : (
            <p className="text-xs text-muted-foreground">O aviso não chegou a nenhum celular {aguardando.destinoNome ? `de ${aguardando.destinoNome}` : "da sua conta"}. No celular, entre com {aguardando.destinoNome ? "a conta dessa pessoa" : "a mesma conta deste computador"}, abra <strong>App no celular</strong>: o pedido aparece lá.</p>
          )}
          <button type="button" onClick={cancelar} disabled={pendente} className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" aria-hidden />Cancelar pedido</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
        {celulares && celulares.length > 1 && (
          <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Mandar para o celular de
            <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              {celulares.map((c) => <option key={c.id} value={c.id}>{c.souEu ? `${c.nome} (você)` : c.nome}</option>)}
            </select>
          </label>
        )}
        {celulares && celulares.length === 1 && !celulares[0].souEu && (
          <p className="text-xs text-muted-foreground">Vai para o celular de <strong className="text-foreground">{celulares[0].nome}</strong> (o único com notificação ativa).</p>
        )}
        {celulares && celulares.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum celular da equipe com notificação ativa. No celular: Neotec OS → seu nome → <strong>App no celular</strong> → Ativar notificações.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => pedir("fotos")} disabled={pendente}><Smartphone className="h-4 w-4" />Tirar fotos pelo celular</Button>
          {lerImei && <Button type="button" variant="outline" size="sm" onClick={() => pedir("imei")} disabled={pendente}><ScanLine className="h-4 w-4" />Ler IMEI pelo celular</Button>}
          <input ref={input} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => tirarAqui(e.target.files)} aria-label="Tirar foto neste aparelho" />
          <Button type="button" variant="ghost" size="sm" onClick={() => input.current?.click()} disabled={pendente}><ImagePlus className="h-4 w-4" />{enviando ?? "Tirar/enviar aqui"}</Button>
        </div>
        </div>
      )}

      {erro && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{erro}</p>}

      {dados === null && !erro ? (
        <p className="text-xs text-muted-foreground" role="status">Carregando fotos…</p>
      ) : fotos.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4" aria-hidden />Nenhuma foto ainda.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f, i) => (
            <li key={f.caminho}>
              <button type="button" onClick={() => f.url && setAmpliada(f.url)} className="block aspect-square w-full overflow-hidden rounded-md bg-secondary" aria-label={`Ampliar foto ${i + 1}`}>
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={`Foto ${i + 1}${f.rotulo ? ` — ${f.rotulo}` : ""}`} loading="lazy" className="h-full w-full object-cover" />
                ) : <span className="text-[10px] text-muted-foreground">indisponível</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fotos.length > 0 && <p className="text-[11px] text-muted-foreground">Última em {formatDateTime(fotos[0].em)}</p>}

      {(dados?.imeis.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">IMEI lido pelo celular: <span className="font-mono text-foreground">{dados!.imeis[0].imei}</span></p>
      )}

      <Dialog open={!!ampliada} onOpenChange={(v) => !v && setAmpliada(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Foto ampliada</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ampliada && <img src={ampliada} alt="Foto ampliada" className="max-h-[80vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
