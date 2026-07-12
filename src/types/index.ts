export * from "./database";

/** Formato padrão de retorno de uma Server Action neste projeto. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Item de navegação da sidebar/topbar. */
export interface NavItem {
  label: string;
  href: string;
  icon: string; // nome do ícone lucide-react, resolvido no componente
  badge?: number;
}
export interface MetaWebhookMensagem {
  object: string;

  entry: {
    id: string;

    changes: {
      field: string;

      value: {
        messaging_product?: string;

        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };

        contacts?: {
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }[];

        messages?: {
          from: string;
          id: string;
          timestamp: string;

          type: string;

          text?: {
            body: string;
          };

          image?: {
            id: string;
            caption?: string;
          };

          document?: {
            id: string;
            filename?: string;
          };
        }[];
      };
    }[];
  }[];
}