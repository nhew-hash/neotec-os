import { PortalCadastroForm } from "@/components/portal/portal-cadastro-form";

export default function PortalCadastroPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Criar minha conta</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Se você já comprou ou trouxe um aparelho pra Neotec, a gente já vincula
          sua conta ao seu histórico automaticamente.
        </p>
        <PortalCadastroForm />
      </div>
    </div>
  );
}
