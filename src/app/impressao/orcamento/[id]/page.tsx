import { notFound } from "next/navigation";
import { montarHtmlImpressaoOrcamento } from "@/services/impressao/impressao-orcamento.service";
import { registrarImpressao } from "@/services/impressao/historico.service";
import { createClient } from "@/lib/supabase/server";

export default async function ImprimirOrcamentoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { id } = await params;
  const { via } = await searchParams;
  const viaCliente = via !== "loja";

  const html = await montarHtmlImpressaoOrcamento(id, viaCliente);
  if (!html) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) void registrarImpressao({ tipoDocumento: "orcamento", referenciaId: id, usuarioId: user.id });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
