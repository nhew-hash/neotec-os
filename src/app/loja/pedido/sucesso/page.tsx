import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function PedidoSucessoPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="font-display text-xl font-semibold text-foreground">Pedido recebido!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {pedido && <>Pedido #{pedido.slice(0, 8)} — </>}
        assim que o pagamento for confirmado, nossa equipe já começa a preparar seu aparelho. Qualquer coisa, te chamamos pelo WhatsApp.
      </p>
      <Link href="/loja" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Voltar pra loja</Link>
    </div>
  );
}
