"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarConfigWhatsappProstecAction } from "@/services/prostec/prostec.actions";
interface ConfigWhatsappProstec {
  phone_number_id: string | null;
  access_token: string | null;
  numero: string | null;
  status: string;
}

export function WhatsappProstecForm({ config }: { config: ConfigWhatsappProstec | null }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const result = await salvarConfigWhatsappProstecAction(formData);
      if (result.success) setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">WhatsApp da Prostec</h2>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${config?.status === "conectado" ? "bg-success/10 text-success-text" : "bg-secondary text-muted-foreground"}`}>
          {config?.status === "conectado" ? "Conectado" : "Desconectado"}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Número PRÓPRIO da Prostec — nunca o mesmo da loja. Cria um app novo no Meta for Developers, WhatsApp Business API, e configura o webhook pra:
        <code className="ml-1 rounded bg-secondary px-1 py-0.5">/api/prostec/whatsapp/webhook</code>
      </p>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Phone Number ID</label>
        <Input name="phone_number_id" defaultValue={config?.phone_number_id ?? ""} className="mt-1" placeholder="Ex: 123456789012345" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Access Token</label>
        <Input name="access_token" type="password" defaultValue={config?.access_token ?? ""} className="mt-1" placeholder="Token permanente do WhatsApp Business" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Número (só pra exibição)</label>
        <Input name="numero" defaultValue={config?.numero ?? ""} className="mt-1" placeholder="Ex: (34) 9XXXX-XXXX" />
      </div>

      {salvo && <p className="text-xs font-medium text-success">Configuração salva.</p>}
      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar"}</Button>
    </form>
  );
}
