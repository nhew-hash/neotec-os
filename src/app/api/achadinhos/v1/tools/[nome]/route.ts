import { NextResponse } from "next/server";
import {
  autenticarRequisicao, executarComContexto, paraResposta, STATUS_HTTP,
} from "@/services/achadinhos/achadinhos.api";

export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO_BYTES = 256 * 1024;
const SEM_CACHE = { "Cache-Control": "no-store" };

/**
 * REST do conector do Claude: `POST /api/achadinhos/v1/tools/<ferramenta>` com
 * o JSON dos argumentos no corpo e `Authorization: Bearer ach_...`.
 * Ex.: POST /api/achadinhos/v1/tools/create_product {"nome": "...", "link_afiliado": "..."}
 */
export async function POST(request: Request, { params }: { params: Promise<{ nome: string }> }) {
  const ctx = await autenticarRequisicao(request);
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401, headers: { "WWW-Authenticate": "Bearer", ...SEM_CACHE } });
  }

  const tamanho = Number(request.headers.get("content-length") ?? 0);
  if (tamanho > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json({ ok: false, codigo: "invalido", erro: "Corpo da requisição grande demais" }, { status: 413, headers: SEM_CACHE });
  }

  let args: unknown = {};
  const texto = await request.text();
  if (texto.trim()) {
    if (texto.length > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json({ ok: false, codigo: "invalido", erro: "Corpo da requisição grande demais" }, { status: 413, headers: SEM_CACHE });
    }
    try {
      args = JSON.parse(texto);
    } catch {
      return NextResponse.json({ ok: false, codigo: "invalido", erro: "Corpo não é um JSON válido" }, { status: 400, headers: SEM_CACHE });
    }
  }

  const { nome } = await params;
  const r = await executarComContexto(ctx, nome, args);
  return NextResponse.json(paraResposta(r), { status: r.ok ? 200 : STATUS_HTTP[r.codigo], headers: SEM_CACHE });
}
