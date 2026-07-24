import { notFound } from "next/navigation";
import { montarHtmlImpressaoVenda } from "@/services/impressao/impressao-venda.service";
import { registrarImpressao } from "@/services/impressao/historico.service";
import { createClient } from "@/lib/supabase/server";

export default async function ImprimirVendaPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { id } = await params;
  const { via } = await searchParams;
  const viaCliente = via !== "loja";

  const html = await montarHtmlImpressaoVenda(id, viaCliente);
  if (!html) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) void registrarImpressao({ tipoDocumento: "venda", referenciaId: id, usuarioId: user.id });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
