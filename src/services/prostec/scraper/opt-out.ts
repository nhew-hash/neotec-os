import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confere opt-out (por telefone) ANTES de inserir um lead novo vindo
 * do scraper. Lead bloqueado nunca entra no pipeline — só soma no
 * contador `total_bloqueados_optout` do job (ver importar-job.service).
 *
 * A Prostec só registra opt-out por telefone hoje (`prostec_opt_out`),
 * não por e-mail — por isso a checagem é só por telefone mesmo (o
 * prompt original também previa e-mail, mas isso exigiria uma tabela
 * nova que não existe e o opt-out real do WhatsApp já cobre o canal
 * que a Iara de fato usa pra abordar).
 */
export async function estaEmOptOut(supabase: SupabaseClient, telefoneE164: string | null): Promise<boolean> {
  if (!telefoneE164) return false;
  // prostec_opt_out.telefone é gravado no formato que paraFormatoInternacionalBR
  // produz — "55DDNNNNNNNNN", sem o "+" (ver prostec-bot.service.ts). O
  // telefone_e164 desta migração guarda o "+" por ser o padrão E.164 de
  // verdade; tira ele só na hora de comparar com esse registro legado.
  const semSinal = telefoneE164.replace(/^\+/, "");
  const { data } = await supabase.from("prostec_opt_out").select("telefone").eq("telefone", semSinal).maybeSingle();
  return Boolean(data);
}
