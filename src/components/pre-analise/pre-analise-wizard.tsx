"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { criarPreAnaliseAction } from "@/services/pre-analise/pre-analise.actions";

interface Dados {
  aparelhoDesejado: string;
  entrada: string;
  temAparelhoTroca: boolean | null;
  aparelhoTrocaModelo: string;
  aparelhoTrocaEstado: string;
  aparelhoTrocaDefeito: string;
  parcelaDesejada: string;
  trabalha: boolean | null;
  tipoTrabalho: string;
  tempoTrabalho: string;
  tempoRegistroClt: string;
  rendaMensal: string;
  estadoCivil: string;
  dependentes: string;
  moradia: string;
  tempoMoradia: string;
  nome: string;
  whatsapp: string;
  termoAceito: boolean;
}

const VAZIO: Dados = {
  aparelhoDesejado: "", entrada: "", temAparelhoTroca: null, aparelhoTrocaModelo: "", aparelhoTrocaEstado: "", aparelhoTrocaDefeito: "",
  parcelaDesejada: "", trabalha: null, tipoTrabalho: "", tempoTrabalho: "", tempoRegistroClt: "", rendaMensal: "",
  estadoCivil: "", dependentes: "", moradia: "", tempoMoradia: "", nome: "", whatsapp: "", termoAceito: false,
};

const OPCOES_TIPO_TRABALHO = [
  { value: "clt", label: "Trabalho registrado (CLT)" }, { value: "autonomo", label: "Autônomo" },
  { value: "empresario", label: "Empresário" }, { value: "servidor_publico", label: "Servidor público" },
  { value: "freelancer", label: "Freelancer" }, { value: "outro", label: "Outro" },
];
const OPCOES_TEMPO = [
  { value: "menos_3_meses", label: "Menos de 3 meses" }, { value: "3_a_6_meses", label: "3 a 6 meses" },
  { value: "6_meses_a_1_ano", label: "6 meses a 1 ano" }, { value: "1_a_2_anos", label: "1 a 2 anos" }, { value: "mais_2_anos", label: "Mais de 2 anos" },
];
const OPCOES_ESTADO_CIVIL = [
  { value: "solteiro", label: "Solteiro(a)" }, { value: "casado", label: "Casado(a)" }, { value: "uniao_estavel", label: "União estável" },
  { value: "divorciado", label: "Divorciado(a)" }, { value: "viuvo", label: "Viúvo(a)" },
];
const OPCOES_DEPENDENTES = [
  { value: "nenhum", label: "Não" }, { value: "1", label: "Sim, 1" }, { value: "2", label: "Sim, 2" }, { value: "3_ou_mais", label: "Sim, 3 ou mais" },
];
const OPCOES_MORADIA = [
  { value: "propria", label: "Próprio" }, { value: "alugada", label: "Alugado" }, { value: "com_familiares", label: "Com os pais/familiares" },
  { value: "financiada", label: "Financiado" }, { value: "outro", label: "Outro" },
];
const OPCOES_TEMPO_MORADIA = [
  { value: "menos_6_meses", label: "Menos de 6 meses" }, { value: "6_meses_a_1_ano", label: "6 meses a 1 ano" },
  { value: "1_a_2_anos", label: "1 a 2 anos" }, { value: "mais_2_anos", label: "Mais de 2 anos" },
];
const OPCOES_ESTADO_APARELHO = [
  { value: "excelente", label: "Excelente" }, { value: "bom", label: "Bom" }, { value: "regular", label: "Regular" }, { value: "com_defeito", label: "Com defeito" },
];

function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function PreAnaliseWizard({ modelos }: { modelos: string[] }) {
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function atualizar(patch: Partial<Dados>) {
    setDados((prev) => ({ ...prev, ...patch }));
  }

  // Passos dinâmicos — pula sub-perguntas quando a resposta principal for "não"/"não trabalha".
  const passos: { valido: () => boolean }[] = [
    { valido: () => !!dados.aparelhoDesejado },
    { valido: () => moedaParaNumero(dados.entrada) >= 0 && dados.entrada !== "" },
    { valido: () => dados.temAparelhoTroca !== null && (!dados.temAparelhoTroca || !!dados.aparelhoTrocaModelo.trim()) },
    { valido: () => moedaParaNumero(dados.parcelaDesejada) >= 0 && dados.parcelaDesejada !== "" },
    { valido: () => dados.trabalha !== null && (!dados.trabalha || (!!dados.tipoTrabalho && !!dados.tempoTrabalho)) },
    { valido: () => moedaParaNumero(dados.rendaMensal) >= 0 && dados.rendaMensal !== "" },
    { valido: () => !!dados.estadoCivil },
    { valido: () => !!dados.dependentes },
    { valido: () => !!dados.moradia },
    { valido: () => !!dados.tempoMoradia },
    { valido: () => dados.nome.trim().length >= 3 && dados.whatsapp.replace(/\D/g, "").length >= 10 },
    { valido: () => dados.termoAceito },
  ];

  const totalPassos = passos.length;
  const podeAvancar = passos[step]?.valido() ?? false;

  function avancar() {
    setErro(null);
    if (!podeAvancar) return setErro("Preenche esse campo pra continuar");
    if (step < totalPassos - 1) setStep(step + 1);
  }

  function voltar() {
    setErro(null);
    if (step > 0) setStep(step - 1);
  }

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const result = await criarPreAnaliseAction({
      aparelhoDesejado: dados.aparelhoDesejado,
      entrada: moedaParaNumero(dados.entrada),
      temAparelhoTroca: !!dados.temAparelhoTroca,
      aparelhoTrocaModelo: dados.aparelhoTrocaModelo || undefined,
      aparelhoTrocaEstado: dados.aparelhoTrocaEstado || undefined,
      aparelhoTrocaDefeito: dados.aparelhoTrocaDefeito || undefined,
      parcelaDesejada: moedaParaNumero(dados.parcelaDesejada),
      trabalha: !!dados.trabalha,
      tipoTrabalho: dados.tipoTrabalho || undefined,
      tempoTrabalho: dados.tempoTrabalho || undefined,
      tempoRegistroClt: dados.tempoRegistroClt || undefined,
      rendaMensal: moedaParaNumero(dados.rendaMensal),
      estadoCivil: dados.estadoCivil,
      dependentes: dados.dependentes,
      moradia: dados.moradia,
      tempoMoradia: dados.tempoMoradia,
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      termoAceito: dados.termoAceito,
    });
    setEnviando(false);
    if (!result.success) return setErro(result.error);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="font-display text-xl font-semibold text-foreground">Pré-análise enviada! ✅</h1>
        <p className="text-sm text-muted-foreground">Recebemos suas informações. Nossa equipe da Neotec irá analisar seu perfil e entrar em contato pelo WhatsApp.</p>
        <Button asChild pill className="mt-2"><a href="https://neotecbrasil.com">Voltar para a Neotec</a></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step === 0 && (
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-foreground">Veja se o Crediário Neotec pode ser para você</h1>
          <p className="mt-2 text-sm text-muted-foreground">Responda algumas perguntas rápidas. Nossa equipe fará uma pré-análise e entrará em contato com você.</p>
          <p className="mt-2 text-xs font-medium text-warning-text">Esta pré-análise não representa aprovação de crédito.</p>
        </div>
      )}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / totalPassos) * 100}%` }} />
      </div>
      <p className="text-center text-[11px] text-muted-foreground">Etapa {step + 1} de {totalPassos}</p>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {step === 0 && (
          <Pergunta titulo="Qual aparelho você deseja comprar?">
            <div className="flex flex-col gap-2">
              {[...modelos, "Outro"].map((m) => (
                <OpcaoBotao key={m} label={m} selecionado={dados.aparelhoDesejado === m} onClick={() => atualizar({ aparelhoDesejado: m })} />
              ))}
            </div>
          </Pergunta>
        )}

        {step === 1 && (
          <Pergunta titulo="Quanto você consegue dar de entrada?">
            <CampoMoeda valor={dados.entrada} onChange={(v) => atualizar({ entrada: v })} />
          </Pergunta>
        )}

        {step === 2 && (
          <Pergunta titulo="Você possui outro aparelho para dar como parte do pagamento?">
            <div className="flex gap-2">
              <OpcaoBotao label="Sim" selecionado={dados.temAparelhoTroca === true} onClick={() => atualizar({ temAparelhoTroca: true })} />
              <OpcaoBotao label="Não" selecionado={dados.temAparelhoTroca === false} onClick={() => atualizar({ temAparelhoTroca: false, aparelhoTrocaModelo: "", aparelhoTrocaEstado: "", aparelhoTrocaDefeito: "" })} />
            </div>
            {dados.temAparelhoTroca && (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Qual aparelho?</label>
                  <Input value={dados.aparelhoTrocaModelo} onChange={(e) => atualizar({ aparelhoTrocaModelo: e.target.value })} className="mt-1" placeholder="Ex: iPhone 12" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Em que estado ele está?</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {OPCOES_ESTADO_APARELHO.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.aparelhoTrocaEstado === o.value} onClick={() => atualizar({ aparelhoTrocaEstado: o.value })} pequeno />)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Possui algum defeito? (opcional)</label>
                  <Input value={dados.aparelhoTrocaDefeito} onChange={(e) => atualizar({ aparelhoTrocaDefeito: e.target.value })} className="mt-1" placeholder="Ex: tela trincada" />
                </div>
              </div>
            )}
          </Pergunta>
        )}

        {step === 3 && (
          <Pergunta titulo="Quanto você consegue pagar por mês?" ajuda="Informa um valor de parcela que realmente caiba no seu orçamento.">
            <CampoMoeda valor={dados.parcelaDesejada} onChange={(v) => atualizar({ parcelaDesejada: v })} sufixo="/mês" />
          </Pergunta>
        )}

        {step === 4 && (
          <Pergunta titulo="Você trabalha atualmente?">
            <div className="flex gap-2">
              <OpcaoBotao label="Sim" selecionado={dados.trabalha === true} onClick={() => atualizar({ trabalha: true })} />
              <OpcaoBotao label="Não" selecionado={dados.trabalha === false} onClick={() => atualizar({ trabalha: false, tipoTrabalho: "", tempoTrabalho: "", tempoRegistroClt: "" })} />
            </div>
            {dados.trabalha && (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Qual sua ocupação?</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {OPCOES_TIPO_TRABALHO.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.tipoTrabalho === o.value} onClick={() => atualizar({ tipoTrabalho: o.value })} pequeno />)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Há quanto tempo trabalha nessa atividade?</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {OPCOES_TEMPO.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.tempoTrabalho === o.value} onClick={() => atualizar({ tempoTrabalho: o.value })} pequeno />)}
                  </div>
                </div>
                {dados.tipoTrabalho === "clt" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Há quanto tempo está registrado?</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {OPCOES_TEMPO.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.tempoRegistroClt === o.value} onClick={() => atualizar({ tempoRegistroClt: o.value })} pequeno />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Pergunta>
        )}

        {step === 5 && (
          <Pergunta titulo="Quanto você ganha aproximadamente por mês?">
            <CampoMoeda valor={dados.rendaMensal} onChange={(v) => atualizar({ rendaMensal: v })} />
          </Pergunta>
        )}

        {step === 6 && (
          <Pergunta titulo="Qual seu estado civil?">
            <div className="flex flex-col gap-2">
              {OPCOES_ESTADO_CIVIL.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.estadoCivil === o.value} onClick={() => atualizar({ estadoCivil: o.value })} />)}
            </div>
          </Pergunta>
        )}

        {step === 7 && (
          <Pergunta titulo="Você possui filhos ou pessoas que dependem financeiramente de você?">
            <div className="flex flex-col gap-2">
              {OPCOES_DEPENDENTES.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.dependentes === o.value} onClick={() => atualizar({ dependentes: o.value })} />)}
            </div>
          </Pergunta>
        )}

        {step === 8 && (
          <Pergunta titulo="Você mora em imóvel?">
            <div className="flex flex-col gap-2">
              {OPCOES_MORADIA.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.moradia === o.value} onClick={() => atualizar({ moradia: o.value })} />)}
            </div>
          </Pergunta>
        )}

        {step === 9 && (
          <Pergunta titulo="Há quanto tempo mora no endereço atual?">
            <div className="flex flex-col gap-2">
              {OPCOES_TEMPO_MORADIA.map((o) => <OpcaoBotao key={o.value} label={o.label} selecionado={dados.tempoMoradia === o.value} onClick={() => atualizar({ tempoMoradia: o.value })} />)}
            </div>
          </Pergunta>
        )}

        {step === 10 && (
          <Pergunta titulo="Só falta seu contato">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Qual seu nome completo?</label>
                <Input value={dados.nome} onChange={(e) => atualizar({ nome: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Qual seu WhatsApp?</label>
                <Input value={dados.whatsapp} onChange={(e) => atualizar({ whatsapp: formatarTelefone(e.target.value) })} className="mt-1" placeholder="(34) 99999-9999" />
              </div>
            </div>
          </Pergunta>
        )}

        {step === 11 && (
          <Pergunta titulo="Confira suas informações">
            <div className="flex flex-col gap-1.5 text-sm">
              <ResumoLinha label="Aparelho desejado" valor={dados.aparelhoDesejado} />
              <ResumoLinha label="Entrada" valor={`R$ ${dados.entrada || "0,00"}`} />
              <ResumoLinha label="Aparelho na troca" valor={dados.temAparelhoTroca ? dados.aparelhoTrocaModelo : "Não"} />
              <ResumoLinha label="Parcela desejada" valor={`R$ ${dados.parcelaDesejada || "0,00"}/mês`} />
              <ResumoLinha label="Trabalha" valor={dados.trabalha ? "Sim" : "Não"} />
              {dados.trabalha && <ResumoLinha label="Tempo de trabalho" valor={OPCOES_TEMPO.find((o) => o.value === dados.tempoTrabalho)?.label ?? "—"} />}
              <ResumoLinha label="Renda mensal" valor={`R$ ${dados.rendaMensal || "0,00"}`} />
              <ResumoLinha label="Estado civil" valor={OPCOES_ESTADO_CIVIL.find((o) => o.value === dados.estadoCivil)?.label ?? "—"} />
              <ResumoLinha label="Dependentes" valor={OPCOES_DEPENDENTES.find((o) => o.value === dados.dependentes)?.label ?? "—"} />
              <ResumoLinha label="Moradia" valor={OPCOES_MORADIA.find((o) => o.value === dados.moradia)?.label ?? "—"} />
              <ResumoLinha label="Tempo de moradia" valor={OPCOES_TEMPO_MORADIA.find((o) => o.value === dados.tempoMoradia)?.label ?? "—"} />
              <ResumoLinha label="Nome" valor={dados.nome} />
              <ResumoLinha label="WhatsApp" valor={dados.whatsapp} />
            </div>

            <label className="mt-4 flex items-start gap-2 text-xs text-foreground">
              <Checkbox checked={dados.termoAceito} onCheckedChange={(v) => atualizar({ termoAceito: !!v })} className="mt-0.5" />
              Declaro que as informações fornecidas são verdadeiras e autorizo a Neotec a utilizá-las para realizar uma pré-análise relacionada à possibilidade de compra a prazo.
            </label>
            <p className="mt-2 text-[11px] text-muted-foreground">Esta pré-análise não representa aprovação de crédito. A eventual concessão de crédito estará sujeita à análise posterior e aos critérios da Neotec.</p>
          </Pergunta>
        )}

        {erro && <p className="mt-3 text-xs text-danger">{erro}</p>}

        <div className="mt-5 flex gap-2">
          {step > 0 && (
            <Button type="button" variant="ghost" size="icon" onClick={voltar} disabled={enviando}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {step < totalPassos - 1 ? (
            <Button type="button" onClick={avancar} disabled={!podeAvancar} className="flex-1" size="lg">Continuar</Button>
          ) : (
            <Button type="button" onClick={enviar} disabled={!podeAvancar || enviando} className="flex-1" size="lg">
              {enviando ? "Enviando..." : "Enviar pré-análise"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Pergunta({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 text-base font-semibold text-foreground">{titulo}</h2>
      {ajuda && <p className="mb-3 text-xs text-muted-foreground">{ajuda}</p>}
      <div className={ajuda ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function OpcaoBotao({ label, selecionado, onClick, pequeno }: { label: string; selecionado: boolean; onClick: () => void; pequeno?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-xl border px-4 text-left font-medium transition-colors ${pequeno ? "py-2 text-xs" : "py-3.5 text-sm"} ${selecionado ? "border-primary bg-primary/5 text-primary" : "border-black/[0.08] text-foreground hover:border-black/20"}`}
    >
      {label}
    </button>
  );
}

function CampoMoeda({ valor, onChange, sufixo }: { valor: string; onChange: (v: string) => void; sufixo?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] px-4 py-3.5 focus-within:border-primary">
      <span className="text-sm text-muted-foreground">R$</span>
      <input
        inputMode="numeric" value={valor}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "") === "" ? "" : (Number(e.target.value.replace(/\D/g, "")) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
        placeholder="0,00" className="flex-1 bg-transparent text-sm outline-none"
      />
      {sufixo && <span className="text-xs text-muted-foreground">{sufixo}</span>}
    </div>
  );
}

function ResumoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-black/[0.04] py-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{valor}</span>
    </div>
  );
}
