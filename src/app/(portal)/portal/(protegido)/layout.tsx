import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "@/components/portal/portal-nav";
import type { ReactNode } from "react";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: cliente } = await supabase
    .from("clientes").select("id, nome, senha_provisoria").eq("portal_user_id", user.id).maybeSingle();

  if (!cliente) redirect("/portal/login");
  if (cliente.senha_provisoria) redirect("/portal/trocar-senha");

  return (
    <div className="flex min-h-screen flex-col bg-app pb-20">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <span className="font-display text-sm font-semibold text-foreground">Olá, {cliente.nome.split(" ")[0]}</span>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <PortalNav />
    </div>
  );
}
