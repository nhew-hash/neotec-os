import Link from "next/link";
import { XCircle } from "lucide-react";
import { LinkWhatsappContato } from "@/components/loja/link-whatsapp-contato";

export default async function PedidoErroPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <XCircle className="h-7 w-7" />
      </div>
      <h1 className="font-display text-xl font-semibold text-foreground">Pagamento não concluído</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {pedido && <>Pedido #{pedido.slice(0, 8)} — </>}
        seu pagamento não foi aprovado ou o processo foi cancelado. Nenhuma cobrança foi feita.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/loja/carrinho" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Tentar de novo</Link>
        <LinkWhatsappContato className="rounded-full border border-black/[0.1] px-6 py-3 text-sm font-semibold text-foreground">Falar no WhatsApp</LinkWhatsappContato>
      </div>
    </div>
  );
}
