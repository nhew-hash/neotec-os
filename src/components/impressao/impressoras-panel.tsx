"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Printer as PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BotaoTestarImpressora } from "./botao-testar-impressora";
import { criarImpressoraAction, removerImpressoraAction, alternarStatusImpressoraAction } from "@/services/impressao/impressoras.actions";
import type { Impressora } from "@/types";

const LABEL_TIPO: Record<string, string> = { a4: "A4", cupom: "Cupom", etiqueta: "Etiqueta" };

export function ImpressorasPanel({ impressoras }: { impressoras: Impressora[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarImpressoraAction(formData);
      if (!result.success) return setErro(result.error);
      setMostrarForm(false);
      router.refresh();
    });
  }

  function handleRemover(id: string) {
    startTransition(() => { void removerImpressoraAction(id); });
  }

  function handleAlternarStatus(id: string, ativa: boolean) {
    startTransition(() => { void alternarStatusImpressoraAction(id, ativa); });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Impressoras cadastradas</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setMostrarForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />Nova impressora
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mostrarForm && (
          <form action={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input name="nome" placeholder="Ex: HP LaserJet Recepção" className="w-56" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select name="tipo" defaultValue="a4">
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="cupom">Cupom</SelectItem>
                  <SelectItem value="etiqueta">Etiqueta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Driver (opcional)</label>
              <Input name="driver" placeholder="Nome do driver no Windows" className="w-56" />
            </div>
            <label className="flex items-center gap-1.5 pb-2 text-xs">
              <input type="checkbox" name="padrao" className="h-4 w-4 accent-primary" />Padrão do tipo
            </label>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar"}</Button>
            {erro && <p className="w-full text-xs text-danger">{erro}</p>}
          </form>
        )}

        {impressoras.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma impressora cadastrada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {impressoras.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{imp.nome}</span>
                    <span className="text-xs text-muted-foreground">{imp.driver ?? "Sem driver informado"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{LABEL_TIPO[imp.tipo]}</Badge>
                  {imp.padrao && <Badge>Padrão</Badge>}
                  <Badge variant={imp.status === "ativa" ? "success" : "secondary"}>{imp.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleAlternarStatus(imp.id, imp.status !== "ativa")} disabled={isPending}>
                    {imp.status === "ativa" ? "Desativar" : "Ativar"}
                  </Button>
                  <BotaoTestarImpressora nomeImpressora={imp.nome} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemover(imp.id)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
