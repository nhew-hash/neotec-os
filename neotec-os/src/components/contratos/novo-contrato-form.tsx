"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarContratoAction } from "@/services/contratos/contrato.actions";

const FREQUENCIAS = [
  { value: "diaria", label: "Diária" }, { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" }, { value: "mensal", label: "Mensal" },
];

export function NovoContratoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [aparelhoId, setAparelhoId] = useState("");
  const [temFiador, setTemFiador] = useState(false);
  const [fiadorNome, setFiadorNome] = useState("");
  const [fiadorCpf, setFiadorCpf] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [frequencia, setFrequencia] = useState("mensal");
  const [numeroPagamentos, setNumeroPagamentos] = useState("12");
  const [valorPagamento, setValorPagamento] = useState("");
  const [temOpcaoAquisicao, setTemOpcaoAquisicao] = useState(true);
  const [valorAquisicao, setValorAquisicao] = useState("");

  function handleSubmit() {
    setErro(null);
    if (!clienteId || !aparelhoId || !dataInicio || !dataFim) return setErro("Preenche cliente, aparelho e as datas");

    startTransition(async () => {
      const result = await criarContratoAction({
        clienteId, aparelhoId, temFiador,
        fiadorNome: temFiador ? fiadorNome : undefined, fiadorCpf: temFiador ? fiadorCpf : undefined,
        dataInicio, dataFim,
        valorEntrada: valorEntrada ? Number(valorEntrada) : undefined,
        frequenciaPagamento: frequencia, numeroPagamentos: Number(numeroPagamentos),
        valorPagamento: valorPagamento ? Number(valorPagamento) : undefined,
        temOpcaoAquisicao, valorOpcaoAquisicao: temOpcaoAquisicao && valorAquisicao ? Number(valorAquisicao) : undefined,
        nivelFormalizacao: "eletronico",
      });
      if (!result.success) return setErro(result.error);
      router.push(`/contratos/${result.data.contratoId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
      <div>
        <label className="text-xs font-medium text-muted-foreground">ID do cliente *</label>
        <Input value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="mt-1" placeholder="Cole o UUID do cliente (busca em Clientes)" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">ID do aparelho (IMEI) *</label>
        <Input value={aparelhoId} onChange={(e) => setAparelhoId(e.target.value)} className="mt-1" placeholder="Cole o UUID do aparelho (busca em Estoque)" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={temFiador} onChange={(e) => setTemFiador(e.target.checked)} className="h-4 w-4 accent-primary" />
        <label className="text-xs font-medium text-foreground">Precisa de fiador</label>
      </div>
      {temFiador && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3">
          <Input placeholder="Nome do fiador" value={fiadorNome} onChange={(e) => setFiadorNome(e.target.value)} />
          <Input placeholder="CPF do fiador" value={fiadorCpf} onChange={(e) => setFiadorCpf(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Data de início *</label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Data de fim *</label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Entrada (R$)</label>
        <Input type="number" value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} className="mt-1" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Frequência</label>
          <Select value={frequencia} onValueChange={setFrequencia}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{FREQUENCIAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nº pagamentos</label>
          <Input type="number" value={numeroPagamentos} onChange={(e) => setNumeroPagamentos(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Valor cada (R$)</label>
          <Input type="number" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={temOpcaoAquisicao} onChange={(e) => setTemOpcaoAquisicao(e.target.checked)} className="h-4 w-4 accent-primary" />
        <label className="text-xs font-medium text-foreground">Tem opção de aquisição ao final</label>
      </div>
      {temOpcaoAquisicao && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Valor da opção de aquisição (R$)</label>
          <Input type="number" value={valorAquisicao} onChange={(e) => setValorAquisicao(e.target.value)} className="mt-1" />
        </div>
      )}

      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="button" onClick={handleSubmit} disabled={isPending}>{isPending ? "Gerando..." : "Gerar contrato"}</Button>
    </div>
  );
}
