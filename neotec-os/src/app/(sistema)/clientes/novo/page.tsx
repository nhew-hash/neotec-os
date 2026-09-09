import { ClienteForm } from "@/components/clientes/cliente-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NovoClientePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Novo cliente</h1>
        <p className="text-sm text-muted-foreground">Cadastro rápido — só nome e WhatsApp são obrigatórios</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
          <CardDescription>Os demais campos podem ser completados depois</CardDescription>
        </CardHeader>
        <CardContent>
          <ClienteForm />
        </CardContent>
      </Card>
    </div>
  );
}
