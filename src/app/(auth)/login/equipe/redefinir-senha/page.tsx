import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form";

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Criar nova senha</h1>
        <p className="mb-8 text-sm text-muted-foreground">Defina uma nova senha pra continuar.</p>
        <RedefinirSenhaForm />
      </div>
    </div>
  );
}
