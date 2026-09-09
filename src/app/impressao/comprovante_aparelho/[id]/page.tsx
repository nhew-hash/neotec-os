import { notFound } from "next/navigation";
import { montarHtmlComprovanteAparelho } from "@/services/impressao/impressao-comprovante-aparelho.service";
import { registrarImpressao } from "@/services/impressao/historico.service";
import { createClient } from "@/lib/supabase/server";

export default async function ImprimirComprovanteAparelhoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entrada?: string; saldo?: string; garantia?: string; observacoes?: string }>;
}) {
  const { id } = await params;
  const { entrada, saldo, garantia, observacoes } = await searchParams;

  const html = await montarHtmlComprovanteAparelho({
    vendaId: id,
    entrada: entrada ? Number(entrada) : undefined,
    saldo: saldo ? Number(saldo) : undefined,
    garantia, observacoes,
  });
  if (!html) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) void registrarImpressao({ tipoDocumento: "comprovante_aparelho", referenciaId: id, usuarioId: user.id });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
