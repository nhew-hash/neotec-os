import { ConsultaOSForm } from "@/components/consulta-publica/consulta-os-form";

export const metadata = { title: "Acompanhe sua assistência — Neotec" };

/**
 * Rota pública, fora dos grupos (auth)/(sistema) — não passa pelo
 * middleware de autenticação. A busca em si roda contra a função
 * `consultar_os_publico` (SECURITY DEFINER, grant para "anon"), que
 * devolve só status/prazo/valor/observações públicas — nunca diagnóstico,
 * dado de cliente ou qualquer campo interno.
 *
 * Redesign (mantendo 100% a lógica/consulta de antes — só a
 * experiência mudou): visual deliberadamente diferente do sistema
 * interno. Lá é "ferramenta de precisão" pra quem trabalha na loja;
 * aqui é "cliente comum no celular, quer uma resposta em segundos" —
 * muito espaço em branco, cantos macios, tipografia grande e acolhedora.
 */
export default async function ConsultarOSPage({ searchParams }: { searchParams: Promise<{ numero?: string }> }) {
  const { numero } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F7F9FC] to-[#EEF1F7] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-white shadow-lg shadow-primary/20">
            N
          </div>
          <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-foreground sm:text-[36px]">
            Acompanhe sua<br />assistência
          </h1>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            Consulte o andamento da manutenção do seu aparelho de forma rápida e segura.
          </p>
        </div>

        <ConsultaOSForm numeroInicial={numero} />

        <p className="mt-10 text-center text-xs text-muted-foreground/70">Neotec Araguari — assistência técnica especializada</p>
      </div>
    </div>
  );
}
