import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { CentralNav } from "@/components/central-comercial/central-nav";

export default async function CentralComercialLayout({ children }: { children: ReactNode }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) redirect("/dashboard");
  return (
    <div className="space-y-6">
      <CentralNav mostrarGerente={auth.cargo === "admin" || auth.cargo === "gerente"} />
      {children}
    </div>
  );
}
