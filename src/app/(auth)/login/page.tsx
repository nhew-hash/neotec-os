"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Search, Users, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsultaOSForm } from "@/components/consulta-publica/consulta-os-form";

const LOJA_VIRTUAL_URL = "https://neotecbrasil.com";

export default function LoginHubPage() {
  const [consultaAberta, setConsultaAberta] = useState(false);

  return (
    <div className="neotec-grid-pattern flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary font-display text-lg font-bold text-white">
            N
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Neotec OS</h1>
            <p className="text-sm text-sidebar-muted">Como você quer entrar?</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* 1. Portal do Cliente — a opção mais usada, por isso a mais destacada */}
          <Link
            href="/portal/login"
            className="flex items-center gap-4 rounded-card border border-primary bg-primary p-5 text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
          >
            <User className="h-6 w-6 shrink-0" />
            <div className="flex flex-col">
              <span className="text-base font-semibold">Portal do Cliente</span>
              <span className="text-xs text-primary-foreground/80">Suas compras, garantias e cashback</span>
            </div>
          </Link>

          {/* 2. Consultar OS — formulário embutido, sem precisar navegar */}
          <div className="overflow-hidden rounded-card border border-sidebar-border bg-sidebar-hover shadow-card">
            <button
              type="button"
              onClick={() => setConsultaAberta((v) => !v)}
              className="flex w-full items-center gap-4 p-4 text-left text-white transition-colors hover:bg-sidebar-active"
            >
              <Search className="h-5 w-5 shrink-0" />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">Consultar Ordem de Serviço</span>
                <span className="text-xs text-sidebar-muted">Sem login — número da OS ou telefone</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-sidebar-muted transition-transform", consultaAberta && "rotate-180")} />
            </button>

            {consultaAberta && (
              <div className="border-t border-sidebar-border bg-app p-4">
                <ConsultaOSForm />
              </div>
            )}
          </div>

          {/* 3. Área da Equipe */}
          <Link
            href="/login/equipe"
            className="flex items-center gap-4 rounded-card border border-sidebar-border bg-sidebar-hover p-4 text-white shadow-card transition-colors hover:bg-sidebar-active"
          >
            <Users className="h-5 w-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Área da Equipe</span>
              <span className="text-xs text-sidebar-muted">Login com e-mail e senha</span>
            </div>
          </Link>

          {/* 4. Loja Virtual — domínio externo, abre em nova aba */}
          <a
            href={LOJA_VIRTUAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-card border border-sidebar-border bg-sidebar-hover p-4 text-white shadow-card transition-colors hover:bg-sidebar-active"
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Loja Virtual</span>
              <span className="text-xs text-sidebar-muted">neotecbrasil.com</span>
            </div>
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-sidebar-muted">Neotec Araguari</p>
      </div>
    </div>
  );
}
