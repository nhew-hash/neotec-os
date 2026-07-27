export type ModoJuros = "repassar_juros" | "embutir_juros";

export interface TaxaParcela {
  parcela: number; // 0 = Pix, 1-12 = parcelamento
  taxaPercentual: number;
}

export interface ConfigPrecificacao {
  modoJuros: ModoJuros;
  descontoPixPercentual: number;
}

export interface OpcaoParcelaCalculada {
  numero: number;
  valorParcela: number;
  valorTotal: number;
  temJuros: boolean;
  taxaAplicada: number;
  recebimentoLiquido: number;
}

export interface ResultadoPrecificacao {
  precoLiquidoDesejado: number;
  precoVitrine: number;
  precoPix: number;
  recebimentoLiquidoPix: number;
  parcelas: OpcaoParcelaCalculada[];
  lucroLiquidoVitrine: number | null; // null quando não tem custo informado — não inventa lucro sem dado real
}

/**
 * PricingEngine — ÚNICO lugar do sistema que faz conta de preço a
 * partir do "preço líquido desejado". Loja, carrinho, checkout,
 * pedidos e financeiro chamam essa classe — nenhum componente ou
 * outro service duplica essa lógica. Taxas e desconto Pix vêm sempre
 * de fora (banco, configurável), nunca hardcoded aqui dentro.
 *
 * ---- A matemática, documentada ----
 *
 * MODO "embutir_juros": existe UM preço de vitrine só, alto o
 * suficiente pra cobrir a MAIOR taxa de parcelamento cadastrada (ex:
 * 12x) — assim a loja pode oferecer QUALQUER parcelamento até 12x
 * "sem juros" pro cliente, porque a taxa já está embutida no preço,
 * não importa em quantas vezes ele escolha pagar.
 *   precoVitrine = precoLiquidoDesejado / (1 - maiorTaxa/100)
 *
 * MODO "repassar_juros": cada forma de pagamento tem seu PRÓPRIO
 * preço, calculado pra que a loja receba o mesmo líquido desejado
 * não importa a forma escolhida — quem paga mais parcelado paga mais
 * caro no total (o juros aparece pro cliente de verdade).
 *   valorNaFormaDePagamento = precoLiquidoDesejado / (1 - taxaDessaForma/100)
 *   precoVitrine, nesse modo, é o valor à vista (1x) — a referência
 *   "de tabela".
 *
 * Desconto Pix é sempre uma camada comercial A MAIS, aplicada por
 * cima do preço-base calculado pra Pix em qualquer um dos dois modos
 * — não é a mesma coisa que a taxa de gateway do Pix (que já é
 * baixíssima, ~0,6%).
 */
export class PricingEngine {
  constructor(
    private readonly taxas: TaxaParcela[],
    private readonly config: ConfigPrecificacao
  ) {}

  private taxaDe(parcela: number): number {
    return this.taxas.find((t) => t.parcela === parcela)?.taxaPercentual ?? 0;
  }

  private maiorTaxaParcelamento(): number {
    const taxasParcelamento = this.taxas.filter((t) => t.parcela >= 1).map((t) => t.taxaPercentual);
    return taxasParcelamento.length > 0 ? Math.max(...taxasParcelamento) : 0;
  }

  calcular(precoLiquidoDesejado: number, custo: number | null = null): ResultadoPrecificacao {
    const taxaPix = this.taxaDe(0);

    let precoVitrine: number;
    if (this.config.modoJuros === "embutir_juros") {
      const maiorTaxa = this.maiorTaxaParcelamento();
      precoVitrine = precoLiquidoDesejado / (1 - maiorTaxa / 100);
    } else {
      const taxa1x = this.taxaDe(1);
      precoVitrine = precoLiquidoDesejado / (1 - taxa1x / 100);
    }

    // Pix: preço-base cobre a taxa real do gateway (garante o líquido
    // desejado), depois aplica o desconto comercial por cima.
    const precoBasePix =
      this.config.modoJuros === "embutir_juros" ? precoVitrine : precoLiquidoDesejado / (1 - taxaPix / 100);
    const precoPix = precoBasePix * (1 - this.config.descontoPixPercentual / 100);
    const recebimentoLiquidoPix = precoPix * (1 - taxaPix / 100);

    const parcelasDisponiveis = this.taxas.filter((t) => t.parcela >= 1).sort((a, b) => a.parcela - b.parcela);

    const parcelas: OpcaoParcelaCalculada[] = parcelasDisponiveis.map((t) => {
      if (this.config.modoJuros === "embutir_juros") {
        return {
          numero: t.parcela,
          valorParcela: precoVitrine / t.parcela,
          valorTotal: precoVitrine,
          temJuros: false,
          taxaAplicada: t.taxaPercentual,
          recebimentoLiquido: precoVitrine * (1 - t.taxaPercentual / 100),
        };
      }
      const valorTotal = precoLiquidoDesejado / (1 - t.taxaPercentual / 100);
      return {
        numero: t.parcela,
        valorParcela: valorTotal / t.parcela,
        valorTotal,
        temJuros: t.taxaPercentual > taxaPix, // referência simples: se a taxa dessa parcela é maior que a do Pix, tem juros embutido no valor cobrado
        taxaAplicada: t.taxaPercentual,
        recebimentoLiquido: precoLiquidoDesejado,
      };
    });

    const lucroLiquidoVitrine = custo != null ? precoLiquidoDesejado - custo : null;

    return { precoLiquidoDesejado, precoVitrine, precoPix, recebimentoLiquidoPix, parcelas, lucroLiquidoVitrine };
  }

  /**
   * Pra produto que ainda não tem "preço líquido desejado" cadastrado
   * (maioria, hoje) — o preço de vitrine já existe (`preco_venda`
   * direto), então não tem o que derivar. Ainda assim dá pra mostrar
   * Pix com desconto e "até Nx sem juros" de forma honesta, só que
   * calculado NA DIREÇÃO CONTRÁRIA: parte do vitrine já fixo, não de
   * um líquido desejado.
   */
  calcularExibicaoComVitrineFixo(precoVitrine: number): { precoPix: number; parcelas: OpcaoParcelaCalculada[] } {
    const taxaPix = this.taxaDe(0);
    // A taxa do Pix já é baixíssima e é custo da loja, não repassado
    // ao cliente — só o desconto comercial (config.descontoPixPercentual)
    // aparece no preço que o cliente vê.
    const precoPixExibido = precoVitrine * (1 - this.config.descontoPixPercentual / 100);

    const parcelasDisponiveis = this.taxas.filter((t) => t.parcela >= 1).sort((a, b) => a.parcela - b.parcela);

    const parcelas: OpcaoParcelaCalculada[] = parcelasDisponiveis.map((t) => {
      if (this.config.modoJuros === "embutir_juros") {
        return {
          numero: t.parcela,
          valorParcela: precoVitrine / t.parcela,
          valorTotal: precoVitrine,
          temJuros: false,
          taxaAplicada: t.taxaPercentual,
          recebimentoLiquido: precoVitrine * (1 - t.taxaPercentual / 100),
        };
      }
      // repassar_juros — parte do vitrine como se fosse o preço 1x, escala pra cima proporcional à taxa de cada parcela vs. a taxa de 1x.
      const taxa1x = this.taxaDe(1);
      const valorTotal = precoVitrine * ((1 - taxa1x / 100) / (1 - t.taxaPercentual / 100));
      return {
        numero: t.parcela,
        valorParcela: valorTotal / t.parcela,
        valorTotal,
        temJuros: t.taxaPercentual > taxaPix,
        taxaAplicada: t.taxaPercentual,
        recebimentoLiquido: valorTotal * (1 - t.taxaPercentual / 100),
      };
    });

    return { precoPix: precoPixExibido, parcelas };
  }
}
