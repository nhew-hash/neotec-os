import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { obterContextoAdmin } from "@/services/achadinhos/achadinhos.admin.service";
import { AchadinhosAdminNav } from "@/components/achadinhos-admin/admin-nav";

export const dynamic = "force-dynamic";

/** Painel dos Achadinhos — só admin e gerente (as chaves de API, só admin). */
export default async function AchadinhosAdminLayout({ children }: { children: ReactNode }) {
  const ctx = await obterContextoAdmin();
  if (!ctx) redirect("/dashboard");
  return (
    <div className="space-y-6 pb-8">
      <AchadinhosAdminNav mostrarChaves={ctx.cargo === "admin"} />
      {children}
    </div>
  );
}
