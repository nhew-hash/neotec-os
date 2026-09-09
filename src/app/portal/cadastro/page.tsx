import { PortalCadastroForm } from "@/components/portal/portal-cadastro-form";

export default function PortalCadastroPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 font-display text-xl font-semibold text-foreground">Criar conta</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhe seus pedidos da Neotec</p>
      <PortalCadastroForm />
    </div>
  );
}
