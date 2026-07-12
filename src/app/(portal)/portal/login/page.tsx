import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Minha Neotec</h1>
        <p className="mb-8 text-sm text-muted-foreground">Acompanhe suas compras, reparos e cashback.</p>
        <PortalLoginForm />
      </div>
    </div>
  );
}
