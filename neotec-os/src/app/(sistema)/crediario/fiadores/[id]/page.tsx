import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarFiadorPorId } from "@/services/crediario/crediario.service";
import { FiadorAnalisePainel } from "@/components/crediario/fiador-analise-painel";
import { formatCurrency } from "@/utils";

export default async function FiadorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiador = await buscarFiadorPorId(id);
  if (!fiador) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crediario/fiadores" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar pros fiadores
      </Link>

      <h1 className="font-display text-xl font-semibold text-foreground">{fiador.nome}</h1>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <Item label="CPF" valor={fiador.cpf} />
          <Item label="Telefone" valor={fiador.telefone} />
          <Item label="E-mail" valor={fiador.email} />
          <Item label="Endereço" valor={fiador.endereco} />
          <Item label="Profissão" valor={fiador.profissao} />
          <Item label="Renda declarada" valor={fiador.renda_declarada ? formatCurrency(fiador.renda_declarada) : null} />
          <Item label="Relação com cliente" valor={fiador.relacao_com_cliente} />
        </dl>
      </div>

      <FiadorAnalisePainel fiador={fiador} />
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string | null }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{valor ?? "—"}</dd></div>;
}
