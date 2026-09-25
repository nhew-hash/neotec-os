"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { criarComandoAction, iniciarEnrollmentAction } from "@/services/neoloc/neoloc.actions";
import type { StatusMdmDispositivo, TipoComandoNeoLoc } from "@/types/neoloc";

const ACOES: { tipo: TipoComandoNeoLoc; label: string; destrutiva?: boolean }[] = [
  { tipo: "bloquear", label: "Bloquear" },
  { tipo: "desbloquear", label: "Desbloquear" },
  { tipo: "reiniciar", label: "Reiniciar" },
  { tipo: "modo_perdido", label: "Modo perdido" },
  { tipo: "atualizar_informacoes", label: "Atualizar informações" },
  { tipo: "apagar", label: "Apagar dispositivo", destrutiva: true },
];

export function DispositivoAcoes({ dispositivoId, statusMdm }: { dispositivoId: string; statusMdm: StatusMdmDispositivo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function enviarComando(tipo: TipoComandoNeoLoc) {
    setErro(null);
    setAviso(null);
    if (tipo === "apagar") {
      const confirmou = window.confirm("Apagar o dispositivo é uma ação destrutiva e não pode ser desfeita. Confirma?");
      if (!confirmou) return;
    }
    startTransition(async () => {
      const resultado = await criarComandoAction({ dispositivoId, tipo, confirmacaoForte: tipo === "apagar" });
      if (!resultado.success) {
        setErro(resultado.error);
        return;
      }
      setAviso("Comando registrado como pendente — aguardando integração real com o MDM (Milestone 1/3).");
      router.refresh();
    });
  }

  function iniciarMatricula() {
    setErro(null);
    setAviso(null);
    startTransition(async () => {
      const resultado = await iniciarEnrollmentAction(dispositivoId, "manual");
      if (!resultado.success) {
        setErro(resultado.error);
        return;
      }
      setAviso("Matrícula marcada como pendente. A matrícula de verdade no MDM depende do Milestone 1 (infraestrutura ainda não disponível).");
      router.refresh();
    });
  }

  if (statusMdm !== "matriculado") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Este dispositivo ainda não está matriculado no MDM. Comandos só ficam disponíveis depois da matrícula (e, de fato, só vão ter efeito
          real no aparelho quando a integração com o NanoMDM existir).
        </p>
        <Button type="button" onClick={iniciarMatricula} disabled={isPending} className="w-fit">
          {isPending ? "Registrando…" : "Marcar matrícula como iniciada"}
        </Button>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <p className="text-xs text-muted-foreground">
        Toda ação abaixo cria um comando auditado na fila do NeoLoc. Como a integração real com o MDM ainda não existe, o comando fica com status
        &quot;pendente&quot; até o Milestone 1 ser validado fisicamente — nada aqui altera o aparelho de verdade ainda.
      </p>
      <div className="flex flex-wrap gap-2">
        {ACOES.map((a) => (
          <Button key={a.tipo} type="button" variant={a.destrutiva ? "destructive" : "outline"} disabled={isPending} onClick={() => enviarComando(a.tipo)}>
            {a.label}
          </Button>
        ))}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
    </div>
  );
}
