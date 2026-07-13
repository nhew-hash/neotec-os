import { RecuperarSenhaForm } from "@/components/auth/recuperar-senha-form";

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Recuperar senha</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Informe o e-mail da sua conta da equipe. Você vai receber um link pra criar uma senha nova.
        </p>
        <RecuperarSenhaForm />
      </div>
    </div>
  );
}
