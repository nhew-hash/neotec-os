import Link from "next/link";
import { ShoppingBag } from "lucide-react";

/**
 * Placeholder — a missão pede o botão e a preparação do lugar na
 * navegação, mas a integração real com a Neotec Brasil é decisão de
 * negócio futura (não modelada ainda: catálogo, checkout, pagamento).
 */
export default function LojaVirtualPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app p-6 text-center">
      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
      <h1 className="font-display text-lg font-semibold text-foreground">Loja Virtual</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Em breve, integrada à Neotec Brasil. Por enquanto, fale com a gente pelo WhatsApp da loja.
      </p>
      <Link href="/login" className="mt-2 text-sm text-primary hover:underline">← Voltar</Link>
    </div>
  );
}
