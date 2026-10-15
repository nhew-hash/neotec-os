import { Suspense, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { listarConversas } from "@/services/whatsapp/whatsapp.service";
import { ComunicacaoShell } from "@/components/comunicacao/comunicacao-shell";
import { ConversasList } from "@/components/comunicacao/conversas-list";

/**
 * Central de Comunicação em tela cheia: lista à esquerda, conversa à direita
 * (no celular, uma de cada vez). O título vem do topo do sistema — aqui não
 * repete, para sobrar altura para as mensagens.
 */
export default async function ComunicacaoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }, conversas] = await Promise.all([supabase.auth.getUser(), listarConversas()]);

  return (
    <div className="-mx-4 -mb-24 -mt-4 md:-m-8">
      <ComunicacaoShell
        lista={
          <Suspense>
            <ConversasList conversas={conversas} usuarioId={user?.id ?? ""} />
          </Suspense>
        }
      >
        {children}
      </ComunicacaoShell>
    </div>
  );
}
