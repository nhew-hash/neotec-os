"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarWhatsappNotificacaoAction } from "@/services/pre-analise/pre-analise.actions";

export function WhatsappNotificacaoForm({ numeroAtual }: { numeroAtual: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      await salvarWhatsappNotificacaoAction(formData);
      setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Notificação de nova pré-análise</h2>
      </div>
      <p className="text-xs text-muted-foreground">Toda vez que alguém preencher o formulário público de pré-análise (link em Pré-análises), esse número recebe automaticamente os dados formatados no WhatsApp — usa a mesma integração de WhatsApp já conectada na loja.</p>
      <Input name="whatsapp_notificacao_vendedor" defaultValue={numeroAtual ?? ""} placeholder="Ex: 5534988178338 (com DDI e DDD, só números)" />
      {salvo && <p className="text-xs font-medium text-success">Salvo.</p>}
      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar"}</Button>
    </form>
  );
}
