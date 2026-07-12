export * from "./database";

/** Item de navegação da sidebar/topbar. */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface MetaWebhookMensagem {
  from: string;
  id: string;
  timestamp: string;

  type:
    | "text"
    | "image"
    | "document"
    | "audio";

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

  audio?: {
    id: string;
  };
}