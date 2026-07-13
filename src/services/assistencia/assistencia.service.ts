import { createClient } from "@/lib/supabase/server";
import { obterCustoItem } from "@/services/estoque/estoque.service";
import { dispararEventoWhatsapp } from "@/services/whatsapp/whatsapp.service";
import type { OrdemServico, Cliente, StatusOS, PecaOS, Produto, ChecklistOS, TipoChecklistOS } from "@/types";

export interface OSComCliente extends OrdemServico {
  cliente: Pick<Cliente, "id" | "nome" | "whatsapp">;
  aparelho: { id: string; imei: string; produto: Pick<Produto, "nome"> | null } | null;
  fotoUrl: string | null;
}

export async function listarOrdensServico(): Promise<OSComCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("*, cliente:clientes(id, nome, whatsapp), aparelho:aparelhos(id, imei, produto:produtos(nome))")
    .order("data_entrada", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as OS: ${error.message}`);
  const ordens = (data ?? []) as unknown as OSComCliente[];

  // Foto do aparelho (tabela polimórfica — não dá pra usar join direto do
  // PostgREST aqui, então busca à parte e mapeia em memória).
  const aparelhoIds = ordens.map((os) => os.aparelho?.id).filter((id): id is string => Boolean(id));
  if (aparelhoIds.length > 0) {
    const { data: fotos } = await supabase
      .from("fotos").select("referencia_id, url").eq("tipo", "aparelho").in("referencia_id", aparelhoIds);
    const fotoPorAparelho = new Map((fotos ?? []).map((f) => [f.referencia_id, f.url]));
    ordens.forEach((os) => {
      os.fotoUrl = os.aparelho ? fotoPorAparelho.get(os.aparelho.id) ?? null : null;
    });
  } else {
    ordens.forEach((os) => { os.fotoUrl = null; });
  }

  return ordens;
}

export async function buscarOSPorId(id: string): Promise<OSComCliente | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Não foi possível carregar a OS: ${error.message}`);
  }
  return data as unknown as OSComCliente;
}

export async function criarOrdemServico(input: {
  cliente_id: string;
  aparelho_id?: string;
  aparelho_descricao?: string;
  defeito: string;
  garantia_dias?: number;
  prazo?: string;
  urgente?: boolean;
}): Promise<OrdemServico> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ordens_servico")
    // numero_os é gerado automaticamente por trigger (formato OS000001) —
    // nunca informado pelo cliente da API.
    .insert({
      cliente_id: input.cliente_id,
      aparelho_id: input.aparelho_id || null,
      aparelho_descricao: input.aparelho_descricao || null,
      defeito: input.defeito,
      garantia_dias: input.garantia_dias ?? null,
      prazo: input.prazo || null,
      urgente: input.urgente ?? false,
    })
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .single();

  if (error) throw new Error(`Não foi possível abrir a OS: ${error.message}`);

  const os = data as unknown as OSComCliente;
  await dispararEventoWhatsapp({
    evento: "nova_os",
    clienteId: os.cliente_id,
    telefone: os.cliente.whatsapp,
    variaveis: { numero_os: os.numero_os, defeito: os.defeito },
  });

  return os;
}

export async function atualizarStatusOS(id: string, status: StatusOS, tecnicoId?: string): Promise<void> {
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (tecnicoId) update.tecnico_id = tecnicoId;
  if (status === "entregue") update.data_saida = new Date().toISOString();

  const { error } = await supabase.from("ordens_servico").update(update).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o status da OS: ${error.message}`);

  const { data: os } = await supabase
    .from("ordens_servico")
    .select("*, cliente:clientes(id, nome, whatsapp)")
    .eq("id", id)
    .single();
  if (!os) return;

  // Evento de WhatsApp correspondente ao novo status (camada preparada,
  // não envia de verdade ainda — ver services/whatsapp)
  if (status === "orcamento") {
    await dispararEventoWhatsapp({
      evento: "orcamento", clienteId: os.cliente_id, telefone: os.cliente.whatsapp,
      variaveis: { numero_os: os.numero_os, valor: String(os.valor ?? "") },
    });
  }
  if (status === "pronto") {
    await dispararEventoWhatsapp({
      evento: "pronto", clienteId: os.cliente_id, telefone: os.cliente.whatsapp,
      variaveis: { numero_os: os.numero_os },
    });
  }

  if (status === "entregue") {
    if (os.garantia_dias) {
      const fim = new Date();
      fim.setDate(fim.getDate() + os.garantia_dias);
      await supabase.from("garantias").insert({
        cliente_id: os.cliente_id,
        aparelho_id: os.aparelho_id,
        os_id: os.id,
        tipo: "servico",
        inicio: new Date().toISOString().slice(0, 10),
        fim: fim.toISOString().slice(0, 10),
      });
      await dispararEventoWhatsapp({
        evento: "garantia", clienteId: os.cliente_id, telefone: os.cliente.whatsapp,
        variaveis: { numero_os: os.numero_os, dias: String(os.garantia_dias) },
      });
    }

    if (os.valor) {
      await supabase.rpc("registrar_lancamento_financeiro", {
        p_tipo: "entrada",
        p_categoria: "Assistência técnica",
        p_valor: os.valor,
        p_origem_tipo: "os",
        p_origem_id: os.id,
        p_usuario_id: tecnicoId ?? null,
      });
    }
  }
}

export async function salvarDiagnostico(id: string, diagnostico: string, valor?: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ordens_servico")
    .update({ diagnostico, valor: valor ?? null, status: "orcamento" })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível salvar o diagnóstico: ${error.message}`);

  const { data: os } = await supabase
    .from("ordens_servico").select("*, cliente:clientes(id, nome, whatsapp)").eq("id", id).single();
  if (os) {
    await dispararEventoWhatsapp({
      evento: "diagnostico", clienteId: os.cliente_id, telefone: os.cliente.whatsapp,
      variaveis: { numero_os: os.numero_os, diagnostico },
    });
  }
}

// ---- Checklist de recebimento e entrega ----

export async function salvarChecklistOS(
  osId: string,
  tipo: TipoChecklistOS,
  input: Omit<ChecklistOS, "id" | "os_id" | "tipo" | "data_checklist" | "responsavel_id">,
  responsavelId: string
): Promise<ChecklistOS> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_os")
    .upsert(
      { os_id: osId, tipo, ...input, responsavel_id: responsavelId },
      { onConflict: "os_id,tipo" }
    )
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível salvar o checklist: ${error.message}`);
  return data;
}

export async function listarChecklistsPorOS(osId: string): Promise<ChecklistOS[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_os").select("*").eq("os_id", osId);
  if (error) throw new Error(`Não foi possível carregar os checklists: ${error.message}`);
  return data ?? [];
}

// ---- Peças utilizadas na OS ----

export interface PecaOSComProduto extends PecaOS {
  produto: Pick<Produto, "id" | "nome">;
}

export async function listarPecasPorOS(osId: string): Promise<PecaOSComProduto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pecas_os")
    .select("*, produto:produtos(id, nome)")
    .eq("os_id", osId);

  if (error) throw new Error(`Não foi possível carregar as peças: ${error.message}`);
  return (data ?? []) as unknown as PecaOSComProduto[];
}

export async function adicionarPecaOS(
  osId: string,
  produtoId: string,
  quantidade: number,
  usuarioId: string
): Promise<void> {
  const supabase = await createClient();
  const custo = await obterCustoItem({ produtoId });

  const { error } = await supabase.from("pecas_os").insert({
    os_id: osId,
    produto_id: produtoId,
    quantidade,
    custo,
  });
  if (error) throw new Error(`Não foi possível adicionar a peça: ${error.message}`);

  await supabase.from("movimentos_estoque").insert({
    produto_id: produtoId,
    tipo: "saida",
    quantidade,
    motivo: `Usada na OS #${osId.slice(0, 8)}`,
    usuario_id: usuarioId,
  });
}
