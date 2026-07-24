import { notFound } from "next/navigation";
import { Smartphone, ShieldCheck, FileText, Wallet, MapPin, Truck } from "lucide-react";
import { buscarLacradoModeloPorNome, listarLacradosVariantesPublico } from "@/services/lacrados/lacrados-publico.service";
import { AdicionarLacradoAoCarrinho } from "@/components/loja/adicionar-lacrado-ao-carrinho";

/**
 * Descrição padrão pra TODO lacrado — pedido explícito ("criar uma
 * descrição padrão para todos os aparelhos lacrados... sem repetir
 * informações desnecessárias"). Não é texto por modelo, é o mesmo
 * bloco pra qualquer lacrado da loja.
 */
const DESTAQUES_LACRADO = [
  { icon: ShieldCheck, texto: "Produto novo, lacrado de fábrica, com garantia Apple." },
  { icon: FileText, texto: "Acompanha nota fiscal." },
  { icon: Wallet, texto: "Parcelamento disponível." },
  { icon: MapPin, texto: "Retirada na loja em Araguari." },
  { icon: Truck, texto: "Ou entrega combinada pelo WhatsApp." },
];

export default async function LacradoProdutoPage({ params }: { params: Promise<{ modelo: string }> }) {
  const { modelo: modeloSlug } = await params;
  const modelo = await buscarLacradoModeloPorNome(modeloSlug);
  if (!modelo) notFound();

  const variantes = await listarLacradosVariantesPublico(modelo.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-[#FAFBFC] to-[#F0F2F6]">
            <Smartphone className="h-32 w-32 text-black/[0.08]" strokeWidth={0.75} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lacrado</span>
            <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">{modelo.nome}</h1>
          </div>

          <AdicionarLacradoAoCarrinho modelo={modelo} variantes={variantes} />

          <div className="mt-2 flex flex-col gap-2.5 rounded-2xl bg-[#FAFBFC] p-4">
            {DESTAQUES_LACRADO.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-foreground">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
