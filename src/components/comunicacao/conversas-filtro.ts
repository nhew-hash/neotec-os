import { formatarTelefone, soDigitos } from "@/lib/telefone";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

export type Filtro = "todos" | "nao_lidas" | "minhas" | "sem_responsavel" | "ia_pausada" | "sem_cadastro";

export const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "nao_lidas", label: "Não lidas" },
  { value: "minhas", label: "Minhas" },
  { value: "sem_responsavel", label: "Sem responsável" },
  { value: "ia_pausada", label: "Aguardando humano" },
  { value: "sem_cadastro", label: "Sem cadastro" },
];

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Nome do cliente ou o telefone formatado (sem o 55). */
export function nomeDaConversa(c: Pick<ConversaComCliente, "cliente" | "telefone">): string {
  return c.cliente?.nome ?? formatarTelefone(c.telefone);
}

/**
 * Filtragem pura (exportada para teste). Corrige o bug da versão anterior:
 * com um termo sem dígitos ("maria"), `telefone.includes("")` era sempre
 * verdadeiro e a busca por nome devolvia TODAS as conversas.
 */
export function filtrarConversas(conversas: ConversaComCliente[], filtro: Filtro, busca: string, usuarioId: string): ConversaComCliente[] {
  let lista = conversas;
  if (filtro === "nao_lidas") lista = lista.filter((c) => c.nao_lidas > 0);
  else if (filtro === "minhas") lista = lista.filter((c) => c.responsavel_id === usuarioId);
  else if (filtro === "sem_responsavel") lista = lista.filter((c) => !c.responsavel_id && c.status === "aberta");
  else if (filtro === "ia_pausada") lista = lista.filter((c) => c.ia_pausada && c.status === "aberta");
  else if (filtro === "sem_cadastro") lista = lista.filter((c) => !c.cliente_id);

  const termo = busca.trim();
  if (!termo) return lista;
  const digitos = soDigitos(termo);
  const texto = normalizar(termo.replace(/[\d()+\-.]/g, " ").trim());
  return lista.filter((c) => {
    const casaNome = texto ? normalizar(c.cliente?.nome ?? "").includes(texto) : true;
    // Telefone: casa pelos últimos dígitos digitados (tolera 55, DDD e 9º dígito).
    const casaTelefone = digitos.length >= 3 ? soDigitos(c.telefone).includes(digitos.slice(-8)) : true;
    return casaNome && casaTelefone && (texto.length > 0 || digitos.length >= 3);
  });
}

