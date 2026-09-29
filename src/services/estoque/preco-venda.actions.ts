"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioPodeEditarPreco } from "./estoque-permissoes.service";
import type { ActionResult, CargoUsuario } from "@/types";

export interface AlterarPrecoVendaInput {
  tipo: "produto" | "aparelho";
  id: string;
  novoPreco: number;
}

/**
 * Edita SOMENTE `preco_venda` — de propósito, o `.update()` abaixo
 * nunca recebe nenhum outro campo, nem quando chamado com o client de
 * service role, exatamente pra impedir que essa ação vire uma porta
 * pra editar custo/estoque/status por engano ou má-fé (item "IMPORTANTE"
 * do pedido: só o preço de venda muda).
 *
 * RLS hoje só dá UPDATE em `produtos`/`aparelhos` pra admin/gerente
 * (vendedor não tem nenhum acesso de escrita nessas tabelas — ver
 * Fase 257). Pra vendedor COM a permissão `editar_preco` concedida
 * conseguir salvar, usa o client de service role só depois de checar
 * a permissão aqui — nunca abrindo uma policy de RLS mais ampla (que
 * daria acesso a outras colunas também).
 */
export async function atualizarPrecoVendaAction(input: AlterarPrecoVendaInput): Promise<ActionResult> {
  try {
    if (!Number.isFinite(input.novoPreco) || input.novoPreco <= 0) {
      return { success: false, error: "Informe um preço válido, maior que zero" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada — entre novamente" };

    const { data: perfil } = await supabase.from("usuarios").select("cargo, nome").eq("id", user.id).maybeSingle<{ cargo: CargoUsuario; nome: string }>();
    if (!perfil) return { success: false, error: "Usuário não encontrado" };

    const podeEditar = await usuarioPodeEditarPreco(user.id, perfil.cargo);
    if (!podeEditar) return { success: false, error: "Você não tem permissão pra alterar preço de venda" };

    const tabela = input.tipo === "produto" ? "produtos" : "aparelhos";
    const admin = createAdminClient();

    let nomeExibido: string;
    let precoAnterior: number | null;
    let lojaId: string;

    if (input.tipo === "produto") {
      const { data: produto, error: erroBusca } = await admin.from("produtos").select("loja_id, nome, preco_venda").eq("id", input.id).maybeSingle();
      if (erroBusca) throw new Error(erroBusca.message);
      if (!produto) return { success: false, error: "Produto não encontrado" };
      nomeExibido = produto.nome;
      precoAnterior = produto.preco_venda;
      lojaId = produto.loja_id;
    } else {
      const { data: aparelho, error: erroBusca } = await admin
        .from("aparelhos")
        .select("loja_id, preco_venda, produto:produtos(nome)")
        .eq("id", input.id)
        .maybeSingle();
      if (erroBusca) throw new Error(erroBusca.message);
      if (!aparelho) return { success: false, error: "Aparelho não encontrado" };
      const produtoRelacionado = Array.isArray(aparelho.produto) ? aparelho.produto[0] : aparelho.produto;
      nomeExibido = produtoRelacionado?.nome ?? "Aparelho";
      precoAnterior = aparelho.preco_venda;
      lojaId = aparelho.loja_id;
    }

    const { error: erroUpdate } = await admin.from(tabela).update({ preco_venda: input.novoPreco }).eq("id", input.id);
    if (erroUpdate) throw new Error(erroUpdate.message);

    await admin.from("preco_venda_historico").insert({
      loja_id: lojaId,
      entidade: input.tipo,
      entidade_id: input.id,
      nome_exibido: nomeExibido,
      preco_anterior: precoAnterior,
      preco_novo: input.novoPreco,
      usuario_id: user.id,
      usuario_nome: perfil.nome,
    });

    revalidatePath("/estoque");
    revalidatePath(`/estoque/${tabela}/${input.id}`);
    revalidatePath("/loja", "layout"); // preco_venda alimenta o catálogo público (buscar_produto_loja/listar_produtos_loja)

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar o preço" };
  }
}
