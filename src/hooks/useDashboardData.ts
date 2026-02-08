/**
 * Hook para carregar dados do dashboard de forma otimizada
 * Utiliza React Query com cache agressivo para dados estáticos
 */

import { useQuery } from "@tanstack/react-query";
import { loadDashboardData, DashboardData } from "@/services/dashboardDataLoader";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: loadDashboardData,
    staleTime: 1000 * 60 * 5, // 5 min - dados considerados frescos
    gcTime: 1000 * 60 * 10, // 10 min - manter em cache
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnMount: false, // Não refetch ao montar se houver cache
    refetchInterval: false, // Sem polling automático
    retry: 2,
  });
}
