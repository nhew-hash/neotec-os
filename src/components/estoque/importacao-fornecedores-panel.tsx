"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarFonteAction, type ExecucaoImportacao, type FonteImportacao } from "@/services/importacao-fornecedores/fontes.actions";

const NOMES_TIPO_LISTA: Record<string, string> = {
  goat_completa: "Lista completa",
  apple_lacrados: "Apple lacrados",
  apple_seminovos: "Apple seminovos",
  android: "Android/tablets",
  perfumes: "Perfumes",
  audio_extras: "JBL/extras",
};

function LinhaFonte({ fonte }: { fonte: FonteImportacao }) {
  const [fornecedor, setFornecedor] = useState(fonte.fornecedor);
  const [ativo, setAtivo] = useState(fonte.ativo);
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  const ehRascunho = fonte.fornecedor === "desconhecido";
  const mudou = fornecedor !== fonte.fornecedor || ativo !== fonte.ativo;

  function salvar() {
    startTransition(async () => {
      const resultado = await atualizarFonteAction(fonte.id, { fornecedor, ativo });
      if (resultado.success) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    });
  }

  return (
    <TableRow className={ehRascunho ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>
      <TableCell>
        <div className="font-medium">{fonte.nome_grupo ?? "(sem nome)"}</div>
        <div className="text-xs text-muted-foreground">{fonte.grupo_id ?? "encaminhada direto pro bot"}</div>
        {ehRascunho && <Badge variant="outline" className="mt-1">Novo grupo visto — ainda não configurado</Badge>}
      </TableCell>
      <TableCell>
        <Select value={fornecedor} onValueChange={setFornecedor}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desconhecido">— escolher —</SelectItem>
            <SelectItem value="goat">Goat</SelectItem>
            <SelectItem value="realeza">Realeza</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} disabled={fornecedor === "desconhecido"} />
      </TableCell>
      <TableCell>
        <Button size="sm" variant={mudou ? "default" : "outline"} disabled={!mudou || pending} onClick={salvar}>
          {salvo ? "Salvo ✓" : pending ? "Salvando..." : "Salvar"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LinhaExecucao({ execucao }: { execucao: ExecucaoImportacao }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {new Date(execucao.created_at).toLocaleString("pt-BR")}
      </TableCell>
      <TableCell className="font-medium capitalize">{execucao.fornecedor}</TableCell>
      <TableCell>{NOMES_TIPO_LISTA[execucao.tipo_lista] ?? execucao.tipo_lista}</TableCell>
      <TableCell>
        {execucao.travada_por_seguranca ? (
          <Badge variant="danger">Travada</Badge>
        ) : execucao.aplicado ? (
          <Badge>Aplicada</Badge>
        ) : (
          <Badge variant="outline">Ignorada</Badge>
        )}
      </TableCell>
      <TableCell className="max-w-md whitespace-pre-wrap text-sm">{execucao.motivo_trava ?? execucao.resumo_whatsapp}</TableCell>
    </TableRow>
  );
}

export function ImportacaoFornecedoresPanel({
  fontesIniciais,
  execucoesIniciais,
}: {
  fontesIniciais: FonteImportacao[];
  execucoesIniciais: ExecucaoImportacao[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Fontes (grupos do WhatsApp)</CardTitle>
        </CardHeader>
        <CardContent>
          {fontesIniciais.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo visto ainda. Adicione o número do bot na comunidade do fornecedor no WhatsApp — assim que a
              primeira mensagem chegar, o grupo aparece aqui pra você só escolher o fornecedor e ativar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fontesIniciais.map((fonte) => (
                  <LinhaFonte key={fonte.id} fonte={fonte} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas listas recebidas</CardTitle>
        </CardHeader>
        <CardContent>
          {execucoesIniciais.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma lista recebida ainda. Assim que um fornecedor postar uma lista na comunidade configurada acima,
              o resultado (aplicado, travado, ou ignorado e por quê) aparece aqui — é o jeito mais rápido de confirmar
              que a importação automática está funcionando.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Lista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execucoesIniciais.map((execucao) => (
                  <LinhaExecucao key={execucao.id} execucao={execucao} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
