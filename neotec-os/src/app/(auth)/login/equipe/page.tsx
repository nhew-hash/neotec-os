import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — identidade da marca (oculto em telas pequenas) */}
      <div className="neotec-grid-pattern relative hidden flex-1 flex-col justify-between bg-sidebar p-12 md:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-display text-base font-bold text-white">
            N
          </div>
          <span className="font-display text-lg font-semibold text-white">Neotec OS</span>
        </div>

        <div className="max-w-sm">
          <p className="font-display text-2xl font-medium leading-snug text-white">
            Cada contato é uma oportunidade.
            <br />
            Cada venda, um relacionamento.
          </p>
          <p className="mt-3 text-sm text-sidebar-muted">
            Central de operações da Neotec Araguari — atendimento, estoque, vendas e
            assistência técnica em um só lugar.
          </p>
        </div>

        <p className="text-xs text-sidebar-muted">Neotec Araguari · Sistema interno</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 items-center justify-center bg-app p-6 md:flex-none md:w-[440px] md:bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1 md:hidden">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary font-display text-base font-bold text-white">
              N
            </div>
          </div>

          <h1 className="font-display text-xl font-semibold text-foreground">Área da Equipe</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Acesse com seu e-mail e senha cadastrados pela administração.
          </p>

          <LoginForm />

          <Link href="/login" className="mt-6 inline-block text-xs text-muted-foreground hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
