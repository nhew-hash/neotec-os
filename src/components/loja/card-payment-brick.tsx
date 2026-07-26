"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (tipo: string, containerId: string, config: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }
}

interface DadosCartaoAprovado {
  token: string;
  installments: number;
  paymentMethodId: string;
}

interface CardPaymentBrickProps {
  publicKey: string;
  valor: number;
  onSubmit: (dados: DadosCartaoAprovado) => void;
  onErro: (mensagem: string) => void;
}

const CONTAINER_ID = "cardPaymentBrick_container";

/**
 * Card Payment Brick — componente OFICIAL do Mercado Pago (iframe
 * seguro deles, não HTML nosso). O número do cartão, CVV e validade
 * nunca chegam no nosso código — o Brick tokeniza tudo dentro do
 * próprio iframe e só nos entrega o token final, no callback
 * `onSubmit`. Mostra parcelamento (1x a 18x) nativamente, calculado
 * pelo próprio Mercado Pago.
 */
export function CardPaymentBrick({ publicKey, valor, onSubmit, onErro }: CardPaymentBrickProps) {
  const carregado = useRef(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;

    async function montar() {
      // SDK carregado via script tag — o pacote npm "mercadopago" é só
      // server-side (Node), o Brick é sempre carregado assim, direto
      // da documentação oficial.
      if (!window.MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://sdk.mercadopago.com/js/v2";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Não foi possível carregar o SDK do Mercado Pago"));
          document.body.appendChild(script);
        });
      }

      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      const bricksBuilder = mp.bricks();

      await bricksBuilder.create("cardPayment", CONTAINER_ID, {
        initialization: { amount: valor },
        customization: { visual: { style: { theme: "default" } } },
        callbacks: {
          onReady: () => setCarregando(false),
          onSubmit: (cardFormData: { token: string; installments: number; payment_method_id: string }) => {
            onSubmit({ token: cardFormData.token, installments: cardFormData.installments, paymentMethodId: cardFormData.payment_method_id });
            return new Promise(() => {}); // Brick espera uma Promise — resolvida indiretamente pelo estado externo (ver checkout page)
          },
          onError: (error: unknown) => {
            onErro(error instanceof Error ? error.message : "Não foi possível processar o cartão. Confira os dados e tenta de novo.");
          },
        },
      });
    }

    montar().catch((err) => onErro(err instanceof Error ? err.message : "Erro ao carregar o formulário de cartão"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Carregando formulário seguro...
        </div>
      )}
      <div id={CONTAINER_ID} />
    </div>
  );
}
