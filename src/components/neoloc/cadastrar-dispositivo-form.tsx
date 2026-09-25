"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cadastrarDispositivoAction } from "@/services/neoloc/neoloc.actions";

interface AparelhoDisponivel {
  id: string;
  imei: string;
  numero_serie: string | null;
  cor: string | null;
  produto: { nome: string } | null;
  contrato: { id: string; numero: string; cliente_nome: string | null } | null;
}

export function CadastrarDispositivoForm({ aparelhos }: { aparelhos: AparelhoDisponivel[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aparelhoId, setAparelhoId] = useState("");
  const [udid, setUdid] = useState("");
  const [imei2, setImei2] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const aparelhoSelecionado = aparelhos.find((a) => a.id === aparelhoId) ?? null;

  function salvar() {
    setErro(null);
    if (!aparelhoId) {
      setErro("Escolha um aparelho em locação.");
      return;
    }
    startTransition(async () => {
      const resultado = await cadastrarDispositivoAction({
        aparelhoId,
        contratoId: aparelhoSelecionado?.contrato?.id ?? null,
        clienteId: null,
        udid: udid.trim() || undefined,
        imei2: imei2.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      if (!resultado.success) {
        setErro(resultado.error);
        return;
      }
      router.push(`/neoloc/dispositivos/${resultado.data.dispositivoId}`);
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aparelho">Aparelho em locação</Label>
        <select
          id="aparelho"
          value={aparelhoId}
          onChange={(e) => setAparelhoId(e.target.value)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
        >
          <option value="">Selecione…</option>
          {aparelhos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.produto?.nome ?? "Aparelho"} · IMEI {a.imei} {a.contrato ? `· Contrato ${a.contrato.numero} (${a.contrato.cliente_nome ?? "—"})` : "· sem contrato vinculado"}
            </option>
          ))}
        </select>
        {aparelhos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum aparelho com status &quot;em locação&quot; sem dispositivo NeoLoc ainda. Isso é definido no Crediário, ao ativar um contrato de locação.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="udid">UDID (opcional por agora — depende do enrollment)</Label>
        <Input id="udid" value={udid} onChange={(e) => setUdid(e.target.value)} placeholder="Preenchido automaticamente após a matrícula no MDM" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="imei2">IMEI 2 (aparelhos dual-SIM)</Label>
        <Input id="imei2" value={imei2} onChange={(e) => setImei2(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Button type="button" onClick={salvar} disabled={isPending}>
        {isPending ? "Salvando…" : "Cadastrar dispositivo"}
      </Button>
    </div>
  );
}
