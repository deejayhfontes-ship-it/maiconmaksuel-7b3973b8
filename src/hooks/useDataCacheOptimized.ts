/**
 * Consolidated hook para dados reutilizáveis com cache agressivo
 * Evita re-fetches desnecessários e deduplicação automática
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cache settings for different data types
const CACHE_CONFIG = {
  // Static data (users, professionals, services, products)
  STATIC: { 
    staleTime: 1000 * 60 * 30, // 30 min
    gcTime: 1000 * 60 * 60,    // 60 min 
  },
  // Semi-dynamic data (recent appointments, services)
  SEMI_DYNAMIC: {
    staleTime: 1000 * 60,       // 1 min
    gcTime: 1000 * 60 * 5,      // 5 min
  },
  // Dynamic data (stats, credits)
  DYNAMIC: {
    staleTime: 1000 * 30,       // 30 sec
    gcTime: 1000 * 60 * 2,      // 2 min
  },
};

/**
 * Hook para clientes com cache agressivo
 */
export function useClientesOptimized() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, celular, email, foto_url")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_CONFIG.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para profissionais com cache agressivo
 */
export function useProfissionaisOptimized() {
  return useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, cor_agenda, ativo")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_CONFIG.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para serviços com cache agressivo
 */
export function useServicosOptimized() {
  return useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("id, nome, preco, duracao_minutos")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_CONFIG.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para produtos com cache agressivo
 */
export function useProdutosOptimized() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, preco, estoque_atual, estoque_minimo")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_CONFIG.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para templates prontos com cache agressivo
 */
export function useTemplatesProntosOptimized() {
  return useQuery({
    queryKey: ["templates-prontos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicacao_templates_prontos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_CONFIG.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
