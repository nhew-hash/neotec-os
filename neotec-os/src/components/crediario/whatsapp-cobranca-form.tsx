"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarConfigWhatsappCobrancaAction } from "@/services/crediario/crediario.actions";

interface ConfigWhatsappCobranca { phone_number_id: string | null; access_token: string | null; numero: string | null; status: string; dias_para_humano: number } 

export function WhatsappCobrancaForm({ config }: { config: ConfigWhatsappCobranca | null }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const result = await salvarConfigWhatsappCobrancaAction(formData);
      if (result.success) setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">WhatsApp de Cobrança</h2>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${config?.status === "conectado" ? "bg-success/10 text-success-text" : "bg-secondary text-muted-foreground"}`}>
          {config?.status === "conectado" ? "Conectado" : "Desconectado"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Número PRÓPRIO — nunca o comercial nem o da Prostec. Webhook: <code className="rounded bg-secondary px-1">/api/crediario/whatsapp/webhook</code></p>

      <Input name="phone_number_id" defaultValue={config?.phone_number_id ?? ""} placeholder="Phone Number ID" />
      <Input name="access_token" type="password" defaultValue={config?.access_token ?? ""} placeholder="Access Token" />
      <Input name="numero" defaultValue={config?.numero ?? ""} placeholder="Número (exibição)" />
      <div>
        <label className="text-xs font-medium text-muted-foreground">Dias de atraso até encaminhar pra humano</label>
        <Input type="number" name="dias_para_humano" defaultValue={config?.dias_para_humano ?? 7} className="mt-1 w-32" />
      </div>

      {salvo && <p className="text-xs font-medium text-success">Salvo.</p>}
      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar"}</Button>
    </form>
  );
}
