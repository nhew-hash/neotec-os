import { listarClasses, listarAparelhosConfigCrediario } from "@/services/crediario/crediario.service";
import { ClassesConfigTable } from "@/components/crediario/classes-config-table";
import { AparelhoConfigForm } from "@/components/crediario/aparelho-config-form";
import { WhatsappCobrancaForm } from "@/components/crediario/whatsapp-cobranca-form";
import { createClient } from "@/lib/supabase/server";

export default async function CrediarioConfiguracoesPage() {
  const supabase = await createClient();
  const [classes, aparelhos, { data: configWhatsapp }] = await Promise.all([
    listarClasses(), listarAparelhosConfigCrediario(),
    supabase.from("integracoes_whatsapp_cobranca").select("*").maybeSingle(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações — Crediário</h1>
        <p className="text-sm text-muted-foreground">Tudo aqui é editável sem precisar mexer em código</p>
      </div>

      <WhatsappCobrancaForm config={configWhatsapp} />

      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Classes de risco</h2>
        <ClassesConfigTable classes={classes} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Aparelhos elegíveis pro crediário</h2>
        <AparelhoConfigForm />
        <div className="mt-3 flex flex-col gap-2">
          {aparelhos.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs">
              <span className="text-foreground">{a.produto_nome}</span>
              <span className="text-muted-foreground">Ref: R$ {a.valor_referencia} · Entrada mín: R$ {a.entrada_minima} · Até {a.prazo_maximo_meses} meses</span>
            </div>
          ))}
          {aparelhos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum aparelho configurado ainda.</p>}
        </div>
      </div>
    </div>
  );
}
