import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout deliberadamente sem sidebar/topbar — telas de impressão (A4 e
 * cupom térmico) precisam ser só o conteúdo, prontas para Ctrl+P.
 * Ainda exige autenticação: impressão de OS não é uma rota pública.
 */
export default async function ImpressaoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0">{children}</div>;
}
