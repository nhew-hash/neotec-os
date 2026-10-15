import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { PropostaForm, type LinhaUI, type PropostaInicial } from "@/components/central-comercial/proposta-form";
import { buscarItemParaProposta } from "@/services/central-comercial/central-comercial.service";
import { obterClienteBasico } from "@/services/central-comercial/clientes-busca.service";
import { contextoDaConversa, obterPropostaParaRetomar } from "@/services/central-comercial/propostas.service";

export const metadata = { title: "Proposta" };
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pegar = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PropostaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) redirect("/dashboard");
  const sp = await searchParams;
  const retomar = pegar(sp.retomar);
  const conversa = pegar(sp.conversa);
  const clienteParam = pegar(sp.cliente);
  const modoParam = pegar(sp.modo);

  const vazio: PropostaInicial = { orcamentoId: null, cliente: null, itens: [], desconto: "", tradeInId: null, modo: modoParam === "whatsapp" ? "whatsapp" : "presencial", conversaId: null, naoContatar: false, observacoes: "", aviso: null };
  let inicial: PropostaInicial = vazio;
  let erro: string | null = null;

  try {
    if (retomar && uuid.test(retomar)) {
      const p = await obterPropostaParaRetomar(retomar, auth.userId, auth.cargo);
      const cliente = await obterClienteBasico(p.clienteId);
      const resolvidos = await Promise.allSettled(p.itens.map((i) => buscarItemParaProposta(i.tipo, i.id)));
      const itens: LinhaUI[] = p.itens.map((i, idx) => {
        const r = resolvidos[idx];
        return r.status === "fulfilled"
          ? { tipo: i.tipo, id: i.id, rotulo: r.value.descricao, preco: r.value.preco, quantidade: i.quantidade }
          : { tipo: i.tipo, id: i.id, rotulo: "Item", preco: 0, quantidade: i.quantidade, indisponivel: true };
      });
      const algumIndisponivel = itens.some((i) => i.indisponivel);
      inicial = {
        orcamentoId: p.orcamentoId, cliente: cliente ?? { id: p.clienteId, nome: p.clienteNome, whatsapp: p.clienteWhatsapp ?? "", cidade: null, clienteDesde: null, orcamentosAbertos: 0 },
        itens, desconto: p.desconto > 0 ? String(p.desconto).replace(".", ",") : "", tradeInId: p.tradeInId, modo: p.modo,
        conversaId: p.conversaId, naoContatar: false, observacoes: p.observacoes ?? "",
        aviso: algumIndisponivel ? "Algum item desta proposta não está mais disponível. Remova-o e atualize. Os valores foram recalculados com os preços de hoje." : "Valores recalculados com os preços de hoje.",
      };
    } else if (conversa && uuid.test(conversa)) {
      const ctx = await contextoDaConversa(conversa);
      if (!ctx) erro = "Não encontrei essa conversa, ou ela ainda não está ligada a um cliente cadastrado. Busque o cliente abaixo.";
      else {
        const cliente = await obterClienteBasico(ctx.clienteId);
        inicial = { ...vazio, cliente, modo: "whatsapp", conversaId: ctx.conversaId, naoContatar: ctx.naoContatar };
      }
    } else if (clienteParam && uuid.test(clienteParam)) {
      inicial = { ...vazio, cliente: await obterClienteBasico(clienteParam) };
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : "Não foi possível abrir a proposta.";
  }

  return (
    <div className="space-y-6">
      <PageHeader title={inicial.orcamentoId ? "Retomar proposta" : "Nova proposta"} description="Valores à vista e parcelados pelo mesmo motor de preços da loja virtual." />
      {erro && <Card className="p-4 text-sm text-danger" role="alert">{erro}</Card>}
      <PropostaForm key={inicial.orcamentoId ?? `${inicial.cliente?.id ?? "novo"}:${inicial.modo}`} inicial={inicial} ehGerencia={auth.cargo === "admin" || auth.cargo === "gerente"} />
    </div>
  );
}
