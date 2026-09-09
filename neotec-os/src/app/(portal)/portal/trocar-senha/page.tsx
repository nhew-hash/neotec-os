import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrocarSenhaForm } from "@/components/portal/trocar-senha-form";

/**
 * Checagem própria, deliberadamente mais simples que a do layout
 * protegido (que fica em (protegido)/layout.tsx): aqui só exige sessão
 * válida — não checa `senha_provisoria`, porque é exatamente essa tela
 * que resolve isso. Colocar essa página dentro do layout protegido foi
 * o que causava o loop de redirecionamento (corrigido nesta mesma leva).
 */
export default async function TrocarSenhaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Crie sua senha</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Este é seu primeiro acesso. Por segurança, defina uma senha só sua antes de continuar.
        </p>
        <TrocarSenhaForm />
      </div>
    </div>
  );
}
