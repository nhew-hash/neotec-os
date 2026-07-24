"use client";

import { useRef, useState, useEffect } from "react";
import { Eraser, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { salvarAssinaturaAction } from "@/services/impressao/assinatura.actions";
import type { TipoDocumentoImpressao, TipoAssinanteDocumento } from "@/types";

interface CapturaAssinaturaProps {
  aberto: boolean;
  onFechar: () => void;
  tipoDocumento: TipoDocumentoImpressao;
  referenciaId: string;
  tipoAssinante: TipoAssinanteDocumento;
  onSalvo?: () => void;
}

/**
 * Pointer Events (não mouse/touch separados) — funciona igual com
 * mouse, dedo (touch) e caneta/stylus (tablet) sem precisar de
 * detecção de dispositivo nem biblioteca externa. É o padrão moderno
 * unificado, suportado por todo navegador relevante hoje.
 */
export function CapturaAssinatura({ aberto, onFechar, tipoDocumento, referenciaId, tipoAssinante, onSalvo }: CapturaAssinaturaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraço, setTemTraço] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    setTemTraço(false);
  }, [aberto]);

  function posicaoRelativa(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = posicaoRelativa(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = posicaoRelativa(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTemTraço(true);
  }

  function handlePointerUp() {
    desenhando.current = false;
  }

  function handleLimpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraço(false);
  }

  async function handleSalvar() {
    const canvas = canvasRef.current;
    if (!canvas || !temTraço) return;
    setSalvando(true);
    setErro(null);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];

    const result = await salvarAssinaturaAction({ tipoDocumento, referenciaId, tipoAssinante, imagemBase64: base64 });
    setSalvando(false);

    if (!result.success) return setErro(result.error);
    onSalvo?.();
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assinatura {tipoAssinante === "cliente" ? "do cliente" : "do técnico"}</DialogTitle>
        </DialogHeader>

        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          className="w-full touch-none rounded-md border border-border bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <p className="text-xs text-muted-foreground">Assine com o dedo, mouse ou caneta na área acima.</p>
        {erro && <p className="text-xs text-danger">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleLimpar} disabled={salvando}>
            <Eraser className="h-4 w-4" />Limpar
          </Button>
          <Button onClick={handleSalvar} disabled={!temTraço || salvando}>
            <Check className="h-4 w-4" />{salvando ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
