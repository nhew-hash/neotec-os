import Link from "next/link";
import { listarIndicadores } from "@/services/indicacoes/indicacoes.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NovoIndicadorButton } from "@/components/indicacoes/novo-indicador-button";
import { formatCurrency, formatWhatsapp } from "@/utils";

export default async function IndicacoesPage() {
  const indicadores = await listarIndicadores();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Indicações" description={`${indicadores.length} indicador(es) cadastrado(s)`} actions={<NovoIndicadorButton />} />

      {indicadores.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum indicador cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indicadores.map((ind) => (
            <Link key={ind.id} href={`/indicacoes/${ind.id}`}>
              <Card className="transition-shadow hover:shadow-card-hover">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{ind.nome}</span>
                    {!ind.ativo && <span className="text-xs text-muted-foreground">Inativo</span>}
                  </div>
                  {ind.telefone && <span className="neotec-id-tag w-fit">{formatWhatsapp(ind.telefone)}</span>}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">{ind.totalIndicacoesOS} indicação(ões) em OS</span>
                    <span className={`neotec-dado text-sm font-semibold ${ind.saldo > 0 ? "text-success" : ind.saldo < 0 ? "text-danger" : "text-muted-foreground"}`}>
                      {formatCurrency(ind.saldo)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
