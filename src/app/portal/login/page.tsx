import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-display text-xl font-semibold text-foreground">Entrar</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhe seus pedidos da Neotec</p>
      <PortalLoginForm />
    </div>
  );
}
