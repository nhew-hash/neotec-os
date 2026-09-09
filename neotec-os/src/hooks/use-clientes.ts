"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/types";

/**
 * Hook client-side para buscar clientes (ex: em um campo de busca com
 * digitação, ou em um modal que não pode depender de um Server Component).
 * A listagem principal da tela /clientes é feita via Server Component +
 * service diretamente — este hook é para casos client-side específicos.
 */
export function useClientes(busca: string) {
  return useQuery({
    queryKey: ["clientes", busca],
    queryFn: async (): Promise<Cliente[]> => {
      const supabase = createClient();
      let query = supabase.from("clientes").select("*").order("nome");

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: busca.length === 0 || busca.length >= 2,
  });
}
