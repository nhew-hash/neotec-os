import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { createClient } from "@/lib/supabase/server";
import { PropostaForm } from "@/components/central-comercial/proposta-form";
import { montarPropostaInicial } from "@/services/central-comercial/proposta-inicial.service";
import { lerParamItensProposta } from "@/services/central-comercial/catalogo";

export const metadata = { title: "Proposta" };
export const dynamic = "force-dynamic";

const pegar = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PropostaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) redirect("/dashboard");
  const sp = await searchParams;
  const retomar = pegar(sp.retomar);
  const conversa = pegar(sp.conversa);
  const clienteParam = pegar(sp.cliente);
  const modoParam = pegar(sp.modo);
  const itensParam = lerParamItensProposta(pegar(sp.itens)); // vindos do Catálogo de venda / Atendimento
  const nota = (pegar(sp.nota) ?? "").slice(0, 500); // necessidade registrada no Atendimento guiado
  const abrirTroca = pegar(sp.troca) === "1";

  const { inicial, erro } = await montarPropostaInicial({ retomar, conversa, cliente: clienteParam, modo: modoParam, itens: itensParam, nota }, auth);
  const supabase = await createClient();
  const { data: eu } = await supabase.from("usuarios").select("nome").eq("id", auth.userId).maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeader title={inicial.orcamentoId ? "Retomar proposta" : "Nova proposta"} description="Valores à vista e parcelados pelo mesmo motor de preços da loja virtual." />
      {erro && <Card className="p-4 text-sm text-danger" role="alert">{erro}</Card>}
      <PropostaForm key={inicial.orcamentoId ?? `${inicial.cliente?.id ?? "novo"}:${inicial.modo}:${pegar(sp.itens) ?? ""}`} inicial={inicial} ehGerencia={auth.cargo === "admin" || auth.cargo === "gerente"} vendedorNome={eu?.nome ?? null} abrirTroca={abrirTroca} />
    </div>
  );
}
