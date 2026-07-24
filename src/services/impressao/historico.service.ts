import { createClient } from "@/lib/supabase/server";
import type { TipoDocumentoImpressao, HistoricoImpressao } from "@/types";

export async function registrarImpressao(input: {
  tipoDocumento: TipoDocumentoImpressao;
  referenciaId: string;
  usuarioId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("historico_impressoes").insert({
    tipo_documento: input.tipoDocumento,
    referencia_id: input.referenciaId,
    usuario_id: input.usuarioId,
  });
  // Não trava a impressão por causa do histórico — se falhar, só loga.
  if (error) console.error("Falha ao registrar histórico de impressão:", error.message);
}

export interface HistoricoImpressaoComUsuario extends HistoricoImpressao {
  usuario: { nome: string } | null;
}

export async function listarHistoricoImpressoes(): Promise<HistoricoImpressaoComUsuario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historico_impressoes")
    .select("*, usuario:usuarios(nome)")
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Não foi possível carregar o histórico: ${error.message}`);
  return (data ?? []) as unknown as HistoricoImpressaoComUsuario[];
}
