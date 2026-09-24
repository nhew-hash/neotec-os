import { notFound } from "next/navigation";
import { ShieldCheck, FileText, Wallet, MapPin, Truck } from "lucide-react";
import { buscarLacradoModeloPorNome, listarLacradosVariantesPublico } from "@/services/lacrados/lacrados-publico.service";
import { LacradoPdpCliente } from "@/components/loja/lacrado-pdp-cliente";
import { CtaTradeIn } from "@/components/loja/cta-trade-in";

// Estoque é informação crítica demais pra arriscar cache defasado —
// depois de "substituir lista" no Central de Cadastro, um item que
// acabou de zerar não pode continuar aparecendo disponível aqui, nem
// por alguns minutos. Sempre busca fresco, direto do banco.
export const revalidate = 0;

/**
 * Descrição padrão pra TODO lacrado — pedido explícito ("criar uma
 * descrição padrão para todos os aparelhos lacrados... sem repetir
 * informações desnecessárias"). Não é texto por modelo, é o mesmo
 * bloco pra qualquer lacrado da loja.
 */
const DESTAQUES_LACRADO = [
  { icon: ShieldCheck, texto: "Produto novo, lacrado de fábrica, com garantia Apple." },
  { icon: FileText, texto: "Acompanha comprovante de compra." },
  { icon: Wallet, texto: "Parcelamento disponível." },
  { icon: MapPin, texto: "Retirada grátis na loja em Araguari." },
  { icon: Truck, texto: "Ou frete grátis pra todo o Brasil." },
];

export default async function LacradoProdutoPage({ params }: { params: Promise<{ modelo: string }> }) {
  const { modelo: modeloSlug } = await params;
  const modelo = await buscarLacradoModeloPorNome(modeloSlug);
  if (!modelo) notFound();

  const variantes = await listarLacradosVariantesPublico(modelo.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <LacradoPdpCliente
        modelo={modelo}
        variantes={variantes}
        nomeModelo={modelo.nome}
        conteudoAntes={
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lacrado</span>
            <h1 className="mt-1 font-display text-section-title text-foreground sm:text-3xl">{modelo.nome}</h1>
          </div>
        }
        conteudoDepois={
          <>
            <CtaTradeIn texto="Dê seu iPhone como parte do pagamento" />

            <div className="mt-2 flex flex-col gap-2.5 rounded-2xl bg-[#FAFBFC] p-4">
              {DESTAQUES_LACRADO.map((d, i) => (
                <div key={i} className="flex items-start gap-3">
                  <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-foreground">{d.texto}</p>
                </div>
              ))}
            </div>
          </>
        }
      />
    </div>
  );
}
