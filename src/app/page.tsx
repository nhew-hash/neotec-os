import { redirect } from "next/navigation";

/**
 * neotecbrasil.com (raiz) é o domínio público da loja — vai direto
 * pra vitrine, sempre. Equipe acessa o painel por /login diretamente
 * (não espera mais que o domínio principal detecte quem é staff).
 */
export default function RootPage() {
  redirect("/loja");
}
