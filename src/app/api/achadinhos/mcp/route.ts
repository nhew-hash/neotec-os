import { NextResponse } from "next/server";
import { escopoPermite } from "@/lib/achadinhos/chaves";
import {
  autenticarRequisicao, executarComContexto, paraResposta, type ContextoApi,
} from "@/services/achadinhos/achadinhos.api";
import { FERRAMENTAS } from "@/services/achadinhos/achadinhos.operacoes";

export const dynamic = "force-dynamic";

/**
 * Servidor MCP (Model Context Protocol) do catálogo Achadinhos — transporte
 * HTTP "streamable" no modo mais simples (uma resposta JSON por requisição,
 * sem SSE). Expõe as MESMAS ferramentas e regras do REST, via
 * `executarFerramenta`. Autenticação: `Authorization: Bearer ach_...`.
 *
 * Só aparecem em `tools/list` as ferramentas que a chave tem escopo pra
 * usar — o modelo nem tenta o que não pode.
 */

const VERSAO_PADRAO = "2025-03-26";
const SEM_CACHE = { "Cache-Control": "no-store" };

const INSTRUCOES =
  "Você administra o catálogo 'Achadinhos da Neotec' (produtos afiliados do Mercado Livre, publicados em neotecbrasil.com/achadinhos). " +
  "Regras: nunca invente preço, desconto, avaliação, número de vendas, característica, garantia ou disponibilidade — se não foi informado, deixe vazio ou pergunte. " +
  "Produtos novos nascem como rascunho; só ative (activate_product) quando a pessoa pedir a publicação. " +
  "Exclusão (delete_product) só quando a pessoa pedir explicitamente, e exige a confirmação textual.";

interface RequisicaoRpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

type RespostaRpc = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const erroRpc = (id: RequisicaoRpc["id"], code: number, message: string): RespostaRpc => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function tratar(msg: RequisicaoRpc, ctx: ContextoApi): Promise<RespostaRpc | null> {
  const ehNotificacao = msg.id === undefined || msg.id === null;
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return erroRpc(msg.id, -32600, "Requisição JSON-RPC inválida");

  switch (msg.method) {
    case "initialize": {
      const pedida = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : VERSAO_PADRAO;
      return {
        jsonrpc: "2.0", id: msg.id ?? null,
        result: {
          protocolVersion: pedida,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "achadinhos-neotec", version: "1.0.0" },
          instructions: INSTRUCOES,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: {} };

    case "tools/list":
      return {
        jsonrpc: "2.0", id: msg.id ?? null,
        result: {
          tools: FERRAMENTAS
            .filter((f) => escopoPermite(ctx.ator.escopos, f.escopo))
            .map((f) => ({ name: f.nome, description: f.descricao, inputSchema: f.entrada })),
        },
      };

    case "tools/call": {
      const nome = msg.params?.name;
      if (typeof nome !== "string") return erroRpc(msg.id, -32602, "params.name é obrigatório");
      const r = await executarComContexto(ctx, nome, msg.params?.arguments ?? {});
      return {
        jsonrpc: "2.0", id: msg.id ?? null,
        result: { content: [{ type: "text", text: JSON.stringify(paraResposta(r), null, 2) }], isError: !r.ok },
      };
    }

    default:
      // Notificações (ex.: notifications/initialized) não têm resposta.
      if (ehNotificacao && msg.method.startsWith("notifications/")) return null;
      return erroRpc(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
}

export async function POST(request: Request) {
  const ctx = await autenticarRequisicao(request);
  if (!ctx) {
    return NextResponse.json(erroRpc(null, -32001, "Não autorizado"), { status: 401, headers: { "WWW-Authenticate": "Bearer", ...SEM_CACHE } });
  }

  const texto = await request.text();
  if (texto.length > 256 * 1024) return NextResponse.json(erroRpc(null, -32600, "Requisição grande demais"), { status: 413, headers: SEM_CACHE });

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return NextResponse.json(erroRpc(null, -32700, "JSON inválido"), { status: 400, headers: SEM_CACHE });
  }

  if (Array.isArray(corpo)) {
    const respostas = (await Promise.all(corpo.map((m) => tratar(m as RequisicaoRpc, ctx)))).filter((r): r is RespostaRpc => r !== null);
    return respostas.length ? NextResponse.json(respostas, { headers: SEM_CACHE }) : new NextResponse(null, { status: 202, headers: SEM_CACHE });
  }

  const resposta = await tratar(corpo as RequisicaoRpc, ctx);
  return resposta ? NextResponse.json(resposta, { headers: SEM_CACHE }) : new NextResponse(null, { status: 202, headers: SEM_CACHE });
}

// Sem canal SSE de servidor→cliente: os métodos abaixo respondem 405 como o protocolo prevê.
const NAO_PERMITIDO = () => new NextResponse(null, { status: 405, headers: { Allow: "POST", ...SEM_CACHE } });
export const GET = NAO_PERMITIDO;
export const DELETE = NAO_PERMITIDO;
