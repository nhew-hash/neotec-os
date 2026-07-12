import { ConsultaOSForm } from "@/components/consulta-publica/consulta-os-form";

export const metadata = { title: "Consultar Ordem de Serviço — Neotec OS" };

/**
 * Rota pública, fora dos grupos (auth)/(sistema) — não passa pelo
 * middleware de autenticação. A busca em si roda contra a função
 * `consultar_os_publico` (SECURITY DEFINER, grant para "anon"), que
 * devolve só status/prazo/valor/observações públicas — nunca diagnóstico,
 * dado de cliente ou qualquer campo interno.
 */
export default function ConsultarOSPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Consultar Ordem de Serviço</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Informe o número da OS e o telefone usado no cadastro.
        </p>
        <ConsultaOSForm />
      </div>
    </div>
  );
}
