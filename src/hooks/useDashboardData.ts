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
    staleTime: 1000 * 30, // 30s - dados considerados frescos
    gcTime: 1000 * 60 * 5, // 5 min - manter em cache
    refetchOnWindowFocus: true, // Refetch ao focar na janela
    refetchOnMount: true, // Refetch ao montar (navegação)
    refetchInterval: 30000, // Polling fallback: 30s
    retry: 2,
  });
}
