"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LeitorImei } from "./leitor-imei";

/** Botão ao lado do campo IMEI: abre a câmera deste aparelho e preenche o campo. */
export function BotaoLerImei({ onLido, className }: { onLido: (imei: string) => void; className?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="icon" className={className} onClick={() => setAberto(true)} aria-label="Ler IMEI com a câmera" title="Ler IMEI com a câmera">
        <ScanLine className="h-4 w-4" />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md p-4">
          <DialogTitle className="font-display text-lg">Ler IMEI</DialogTitle>
          {aberto && <LeitorImei onLido={(imei) => { onLido(imei); setAberto(false); }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
