import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function gerarSenhaProvisoria(): string {
  // 8 caracteres alfanuméricos — suficiente para uma senha de uso único
  // que será trocada no primeiro acesso (obrigatório, ver portal.actions).
  return Math.random().toString(36).slice(-8);
}

/**
 * Cria o acesso do cliente ao Portal (ação da equipe, não do cliente).
 * Exige e-mail cadastrado — é a credencial do portal (ver decisão sobre
 * CPF x e-mail em ARCHITECTURE.md). Retorna a senha provisória em texto
 * puro UMA vez, para a equipe repassar ao cliente — nunca fica salva em
 * lugar nenhum além do próprio Supabase Auth (com hash).
 */
export async function criarAcessoPortal(clienteId: string): Promise<{ email: string; senhaProvisoria: string }> {
  const supabase = await createClient();
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes").select("id, email, nome").eq("id", clienteId).single();

  if (erroCliente || !cliente) throw new Error("Cliente não encontrado");
  if (!cliente.email) throw new Error("Cliente precisa ter um e-mail cadastrado para acessar o portal");

  const admin = createAdminClient();
  const senhaProvisoria = gerarSenhaProvisoria();

  const { data: authUser, error: erroAuth } = await admin.auth.admin.createUser({
    email: cliente.email,
    password: senhaProvisoria,
    email_confirm: true,
  });

  if (erroAuth || !authUser.user) {
    throw new Error(erroAuth?.message ?? "Não foi possível criar o acesso do portal");
  }

  const { error: erroVinculo } = await supabase
    .from("clientes")
    .update({ portal_user_id: authUser.user.id, senha_provisoria: true })
    .eq("id", clienteId);

  if (erroVinculo) throw new Error(`Não foi possível vincular o acesso: ${erroVinculo.message}`);

  return { email: cliente.email, senhaProvisoria };
}

export async function trocarSenhaPrimeiroAcesso(novaSenha: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida");

  const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
  if (erroSenha) throw new Error(erroSenha.message);

  await supabase.from("clientes").update({ senha_provisoria: false }).eq("portal_user_id", user.id);
}
