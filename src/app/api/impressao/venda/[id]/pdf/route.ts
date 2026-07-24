import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarNotaVendaPDF } from "@/services/impressao/nota-venda-pdf";
import { registrarImpressao } from "@/services/impressao/historico.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const pdfBuffer = await gerarNotaVendaPDF(id);
  if (!pdfBuffer) return new NextResponse("Venda não encontrada", { status: 404 });

  void registrarImpressao({ tipoDocumento: "venda", referenciaId: id, usuarioId: user.id });

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nota-venda-${id.slice(0, 8)}.pdf"`,
    },
  });
}
