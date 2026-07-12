import { redirect } from "next/navigation";

/**
 * A raiz "/" nunca é exibida diretamente — o middleware já redireciona
 * requisições não autenticadas para /login e autenticadas para
 * /dashboard. Este redirect é apenas uma rede de segurança.
 */
export default function RootPage() {
  redirect("/dashboard");
}
