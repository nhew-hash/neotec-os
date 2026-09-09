import { notFound } from "next/navigation";
import { buscarPropostaPublicaPorToken } from "@/services/prostec/prostec.service";
import { PropostaPublicaCliente } from "@/components/prostec/proposta-publica-cliente";

// Página pública — sem login, sem sidebar do sistema. Nunca cachear
// (status de visualização/resposta precisa refletir na hora).
export const revalidate = 0;

export default async function PropostaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposta = await buscarPropostaPublicaPorToken(token);
  if (!proposta) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <PropostaPublicaCliente proposta={proposta} token={token} />
    </div>
  );
}
