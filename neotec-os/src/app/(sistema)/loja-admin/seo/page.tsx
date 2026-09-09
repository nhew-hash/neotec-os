import { redirect } from "next/navigation";
import { buscarConfigSeo } from "@/services/loja-admin/central-loja.service";
import { SeoPanel } from "@/components/loja-admin/seo-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function SeoPage() {
  const config = await buscarConfigSeo();
  if (!config) redirect("/loja-admin");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="SEO" description="Como a loja aparece no Google e ao compartilhar em redes sociais" />
      <SeoPanel config={config} />
    </div>
  );
}
