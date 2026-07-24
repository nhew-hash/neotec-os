import { notFound } from "next/navigation";
import { montarHtmlImpressaoOS } from "@/services/impressao/impressao-os.service";
import { registrarImpressao } from "@/services/impressao/historico.service";
import { createClient } from "@/lib/supabase/server";
import type { FormatoImpressao } from "@/types";

interface ImprimirOSPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formato?: string; via?: string }>;
}

export default async function ImprimirOSPage({ params, searchParams }: ImprimirOSPageProps) {
  const { id } = await params;
  const { formato, via } = await searchParams;

  const formatoFinal: FormatoImpressao = formato === "cupom" ? "cupom" : "a4";
  const viaCliente = via !== "loja"; // padrão é via cliente (com QR) — precisa pedir explicitamente "loja" pra tirar o QR

  const html = await montarHtmlImpressaoOS(id, formatoFinal, viaCliente);
  if (!html) notFound();

  // Registra no histórico — não bloqueia a renderização se falhar.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) void registrarImpressao({ tipoDocumento: "os", referenciaId: id, usuarioId: user.id });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
