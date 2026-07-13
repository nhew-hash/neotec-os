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

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Autocadastro do cliente no Portal (sem sessão ainda, sem staff
 * envolvido — por isso usa a Service Role Key em toda a operação).
 *
 * Regra de vínculo: se já existe um cliente com o mesmo WhatsApp ou CPF,
 * a conta nova se vincula a ESSE cadastro (evita duplicar cliente que já
 * comprou na loja antes de ter portal). Se ninguém bater, cria um cliente
 * novo. Em nenhum dos dois casos a senha é provisória — foi o próprio
 * cliente que escolheu, não faz sentido forçar troca no primeiro acesso.
 */
export async function autoCadastrarCliente(input: {
  nome: string;
  whatsapp: string;
  cpf?: string;
  email: string;
  senha: string;
}): Promise<{ clienteId: string }> {
  const admin = createAdminClient();
  const whatsappDigits = apenasDigitos(input.whatsapp);
  const cpfDigits = input.cpf ? apenasDigitos(input.cpf) : null;

  // 1) Tenta achar cliente existente por WhatsApp (comparação exata —
  // o cadastro de cliente já normaliza esse campo só com dígitos).
  let clienteExistente: { id: string; email: string | null; portal_user_id: string | null } | null = null;

  const { data: porWhatsapp } = await admin
    .from("clientes")
    .select("id, email, portal_user_id")
    .eq("whatsapp", whatsappDigits)
    .maybeSingle();

  clienteExistente = porWhatsapp;

  // 2) Se não achou por WhatsApp e o CPF foi informado, tenta por CPF —
  // feito em memória porque o campo cpf não é normalizado no cadastro
  // manual (pode ter pontuação), então não dá pra comparar direto no banco.
  if (!clienteExistente && cpfDigits) {
    const { data: candidatos } = await admin.from("clientes").select("id, email, portal_user_id, cpf").not("cpf", "is", null);
    const encontrado = (candidatos ?? []).find((c) => c.cpf && apenasDigitos(c.cpf) === cpfDigits);
    if (encontrado) clienteExistente = encontrado;
  }

  if (clienteExistente?.portal_user_id) {
    throw new Error("Já existe uma conta no Portal para esse WhatsApp/CPF. Faça login, ou peça pra equipe da loja te ajudar a recuperar o acesso.");
  }

  // 3) Cria o usuário de autenticação — senha é a que o cliente escolheu.
  const { data: authUser, error: erroAuth } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
  });

  if (erroAuth || !authUser.user) {
    throw new Error(erroAuth?.message ?? "Não foi possível criar sua conta");
  }

  let clienteId: string;

  if (clienteExistente) {
    // Vincula ao cadastro já existente — só preenche e-mail se estava vazio,
    // nunca sobrescreve dado que a loja já tinha.
    clienteId = clienteExistente.id;
    await admin
      .from("clientes")
      .update({
        portal_user_id: authUser.user.id,
        senha_provisoria: false,
        email: clienteExistente.email ?? input.email,
      })
      .eq("id", clienteId);
  } else {
    const { data: novoCliente, error: erroCliente } = await admin
      .from("clientes")
      .insert({
        nome: input.nome,
        whatsapp: whatsappDigits,
        cpf: input.cpf || null,
        email: input.email,
        portal_user_id: authUser.user.id,
        senha_provisoria: false,
      })
      .select("id")
      .single();

    if (erroCliente || !novoCliente) {
      throw new Error(`Não foi possível criar seu cadastro: ${erroCliente?.message}`);
    }
    clienteId = novoCliente.id;
  }

  return { clienteId };
}
