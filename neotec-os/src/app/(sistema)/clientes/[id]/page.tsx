import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buscarClientePorId } from "@/services/clientes/clientes.service";
import { listarCashbackPorCliente, obterSaldoCashback } from "@/services/cashback/cashback.service";
import { listarGarantiasPorCliente } from "@/services/garantias/garantias.service";
import { listarTimelinePorCliente } from "@/services/timeline/timeline.service";
import { ClienteProfileTabs } from "@/components/clientes/cliente-profile-tabs";
import { CashbackQuickForm } from "@/components/clientes/cashback-quick-form";
import { CriarAcessoPortalButton } from "@/components/clientes/criar-acesso-portal-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWhatsapp, getInitials, formatDate } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import type { CargoUsuario, Venda, OrdemServico, Orcamento, Conversa, Foto } from "@/types";

export default async function ClientePerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await buscarClientePorId(id);
  if (!cliente) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  const cargo = perfil?.cargo ?? "vendedor";

  const [
    { data: vendas },
    { data: ordensServico },
    cashback,
    saldoCashback,
    garantias,
    timeline,
    { data: orcamentos },
    { data: conversas },
    { data: fotos },
  ] = await Promise.all([
    supabase.from("vw_vendas_seguro").select("*").eq("cliente_id", id).order("data_venda", { ascending: false }),
    supabase.from("ordens_servico").select("*").eq("cliente_id", id).order("data_entrada", { ascending: false }),
    listarCashbackPorCliente(id),
    obterSaldoCashback(id),
    listarGarantiasPorCliente(id),
    listarTimelinePorCliente(id),
    supabase.from("orcamentos").select("*").eq("cliente_id", id).order("data_criacao", { ascending: false }),
    supabase.from("conversas").select("*").eq("cliente_id", id).order("data_inicio", { ascending: false }),
    supabase.from("fotos").select("*").eq("tipo", "cliente").eq("referencia_id", id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
            {getInitials(cliente.nome)}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">{cliente.nome}</h1>
            <p className="font-mono text-sm text-muted-foreground">{formatWhatsapp(cliente.whatsapp)}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clientes/${id}/editar`}><Pencil className="h-4 w-4" />Editar</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-5">
            <ClienteProfileTabs
              timeline={timeline}
              vendas={(vendas ?? []) as unknown as Venda[]}
              ordensServico={(ordensServico ?? []) as unknown as OrdemServico[]}
              cashback={cashback}
              saldoCashback={saldoCashback}
              garantias={garantias}
              orcamentos={(orcamentos ?? []) as unknown as Orcamento[]}
              conversas={(conversas ?? []) as unknown as Conversa[]}
              fotos={(fotos ?? []) as unknown as Foto[]}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Info label="E-mail" value={cliente.email} />
              <Info label="CPF" value={cliente.cpf} />
              <Info label="Apple ID" value={cliente.apple_id} />
              <Info label="Nascimento" value={cliente.data_nascimento ? formatDate(cliente.data_nascimento) : null} />
              <Info label="Cidade/UF" value={cliente.cidade ? `${cliente.cidade}/${cliente.estado ?? "—"}` : null} />
              <Info label="Origem" value={cliente.origem} />
              <Info label="Aceita marketing" value={cliente.aceita_marketing ? "Sim" : "Não"} />
              <Info label="Observações" value={cliente.observacoes} />
            </CardContent>
          </Card>

          {podeVerCusto(cargo) && (
            <Card>
              <CardHeader><CardTitle>Cashback manual</CardTitle></CardHeader>
              <CardContent><CashbackQuickForm clienteId={id} /></CardContent>
            </Card>
          )}

          {podeVerCusto(cargo) && (
            <Card>
              <CardHeader><CardTitle>Portal do Cliente</CardTitle></CardHeader>
              <CardContent>
                <CriarAcessoPortalButton clienteId={id} jaTemAcesso={Boolean(cliente.portal_user_id)} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}
