import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Retiradas agendadas da loja virtual (Fase 148), executadas pelo cron diário.
 *
 * Service Role de propósito: o cron não tem sessão de usuário, e com o client
 * de sessão o RLS devolvia zero linhas — a retirada agendada nunca acontecia
 * (sem erro nenhum). Saiu de `estoque.actions.ts` porque aquele arquivo é
 * "use server": uma função com Service Role ali viraria Server Action
 * invocável pelo navegador.
 */
export async function processarRetiradasAgendadas(): Promise<{ produtos: number; aparelhos: number }> {
  const supabase = createAdminClient();
  const agora = new Date().toISOString();

  const { data: produtosRetirados, error: erroProdutos } = await supabase
    .from("produtos")
    .update({ visivel_loja: false, retirar_em: null })
    .lte("retirar_em", agora)
    .not("retirar_em", "is", null)
    .select("id");

  if (erroProdutos) throw new Error(`Falha ao retirar produtos agendados: ${erroProdutos.message}`);

  const { data: aparelhosRetirados, error: erroAparelhos } = await supabase
    .from("aparelhos")
    .update({ disponivel_loja_virtual: false, retirar_em: null })
    .lte("retirar_em", agora)
    .not("retirar_em", "is", null)
    .select("id");

  if (erroAparelhos) throw new Error(`Falha ao retirar aparelhos agendados: ${erroAparelhos.message}`);

  return { produtos: produtosRetirados?.length ?? 0, aparelhos: aparelhosRetirados?.length ?? 0 };
}
