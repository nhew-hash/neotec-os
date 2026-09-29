"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { desativarFuncionarioAction, concederPermissaoEditarPrecoAction } from "@/services/equipe/equipe.actions";
import type { MembroEquipe } from "@/services/equipe/equipe.service";

const LABEL_CARGO: Record<string, string> = {
  admin: "Admin", gerente: "Gerente", vendedor: "Vendedor (loja)",
  tecnico: "Técnico", caixa: "Caixa", vendedor_prostec: "Vendedor (Prostec)",
  investidor: "Investidor", indicador: "Indicador",
};

export function EquipeTable({ equipe }: { equipe: MembroEquipe[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="p-3 font-medium">Nome</th>
            <th className="p-3 font-medium">E-mail</th>
            <th className="p-3 font-medium">Cargo</th>
            <th className="p-3 font-medium">Editar preço (Estoque)</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {equipe.map((m) => <LinhaMembro key={m.id} membro={m} />)}
        </tbody>
      </table>
      {equipe.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma conta cadastrada ainda.</p>}
    </div>
  );
}

function LinhaMembro({ membro }: { membro: MembroEquipe }) {
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [removido, setRemovido] = useState(false);
  const [podeEditarPreco, setPodeEditarPreco] = useState(membro.podeEditarPreco);
  const [salvandoPermissao, setSalvandoPermissao] = useState(false);

  async function handleRemover() {
    setRemovendo(true);
    const result = await desativarFuncionarioAction(membro.id);
    setRemovendo(false);
    if (result.success) setRemovido(true);
  }

  async function handleTogglePermissao() {
    const novoValor = !podeEditarPreco;
    setPodeEditarPreco(novoValor); // otimista
    setSalvandoPermissao(true);
    const result = await concederPermissaoEditarPrecoAction(membro.id, novoValor);
    setSalvandoPermissao(false);
    if (!result.success) setPodeEditarPreco(!novoValor); // desfaz
  }

  if (removido) return null;

  return (
    <tr className="border-b border-black/[0.04] last:border-0">
      <td className="p-3 font-medium text-foreground">{membro.nome}</td>
      <td className="p-3 text-muted-foreground">{membro.email}</td>
      <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">{LABEL_CARGO[membro.cargo] ?? membro.cargo}</span></td>
      <td className="p-3">
        {membro.cargo === "admin" || membro.cargo === "gerente" ? (
          <span className="text-xs text-muted-foreground">Sempre pode</span>
        ) : membro.cargo === "tecnico" ? (
          <span className="text-xs text-muted-foreground">Nunca pode</span>
        ) : (
          <label className="flex items-center gap-1.5 text-xs text-foreground">
            <input type="checkbox" checked={podeEditarPreco} onChange={handleTogglePermissao} disabled={salvandoPermissao} className="h-3.5 w-3.5 accent-primary" />
            Permitido
          </label>
        )}
      </td>
      <td className="p-3 text-right">
        {confirmando ? (
          <div className="flex items-center justify-end gap-1.5 text-xs">
            <span className="text-danger">Remover de vez?</span>
            <button type="button" onClick={handleRemover} disabled={removendo} className="font-medium text-danger hover:underline">{removendo ? "..." : "Sim"}</button>
            <button type="button" onClick={() => setConfirmando(false)} className="text-muted-foreground hover:underline">Não</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="text-muted-foreground hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
