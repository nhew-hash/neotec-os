import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { montarHtmlImpressaoOS } from "@/services/impressao/impressao-os.service";
import { montarHtmlImpressaoOrcamento } from "@/services/impressao/impressao-orcamento.service";
import { montarHtmlImpressaoVenda, montarHtmlImpressaoRecibo } from "@/services/impressao/impressao-venda.service";
import { registrarImpressao } from "@/services/impressao/historico.service";
import type { FormatoImpressao, TipoDocumentoImpressao } from "@/types";

/**
 * Devolve só o HTML já pronto do documento (não uma página Next.js
 * completa) — é o que o QzTrayPrintProvider busca antes de mandar pro
 * QZ Tray. Exige sessão de usuário — mesma proteção das páginas
 * `/impressao/*`, isso não é rota pública.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo, id } = await params;
  const formato = (request.nextUrl.searchParams.get("formato") ?? "a4") as FormatoImpressao;
  const via = request.nextUrl.searchParams.get("via");
  const viaCliente = via !== "loja";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  let html: string | null = null;

  switch (tipo as TipoDocumentoImpressao) {
    case "os":
      html = await montarHtmlImpressaoOS(id, formato, viaCliente);
      break;
    case "orcamento":
      html = await montarHtmlImpressaoOrcamento(id, viaCliente);
      break;
    case "venda":
      html = await montarHtmlImpressaoVenda(id, viaCliente);
      break;
    case "recibo":
      html = await montarHtmlImpressaoRecibo(id, viaCliente);
      break;
    default:
      return NextResponse.json({ erro: `Tipo de documento "${tipo}" não suportado` }, { status: 400 });
  }

  if (!html) return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });

  void registrarImpressao({ tipoDocumento: tipo as TipoDocumentoImpressao, referenciaId: id, usuarioId: user.id });

  return NextResponse.json({ html });
}
