/**
 * Route Health Check Hook
 * Verifies all routes in the app against ROUTE_PERMISSIONS
 * and checks for potential issues like missing permissions or legacy auth usage
 */

import { useMemo } from 'react';
import { ROUTE_PERMISSIONS, PinRole } from '@/contexts/PinAuthContext';

export interface RouteInfo {
  path: string;
  isDynamic: boolean;
  hasPermission: boolean;
  allowedRoles: PinRole[];
  issues: string[];
}

export interface RouteHealthReport {
  totalRoutes: number;
  protectedRoutes: number;
  publicRoutes: number;
  dynamicRoutes: number;
  routesWithIssues: number;
  routes: RouteInfo[];
  summary: string[];
}

// All routes defined in App.tsx (extracted for analysis)
const APP_ROUTES = {
  public: [
    '/login',
    '/cadastro',
    '/recuperar-senha',
    '/confirmar/:token',
    '/ponto',
    '/tablet/cliente',
  ],
  protected: [
    '/dashboard',
    '/clientes',
    '/profissionais',
    '/profissionais/:id',
    '/profissional/:id',
    '/servicos',
    '/produtos',
    '/agenda',
    '/atendimentos',
    '/caixa',
    '/caixa/extrato',
    '/caixa/comandas',
    '/caixa/dividas',
    '/caixa/gorjetas',
    '/caixa/historico',
    '/caixa/gaveta',
    '/caixa/fechar',
    '/caixa/pdv',
    '/financeiro',
    '/financeiro/vales',
    '/financeiro/fechamento-semanal',
    '/financeiro/dividas',
    '/financeiro/cheques',
    '/relatorios',
    '/relatorios/completo',
    '/usuarios',
    '/notas-fiscais',
    '/nota-fiscal/:id',
    '/configuracoes/fiscal',
    '/configuracoes/whatsapp',
    '/configuracoes/metas',
    '/confirmacoes-whatsapp',
    '/whatsapp',
    '/atendimento-whatsapp',
    '/gestao-rh',
    '/configuracoes',
    '/configuracoes/notificacoes',
    '/configuracoes/integracoes',
    '/configuracoes/caixa-pdv',
    '/configuracoes/taxa-falta',
    '/perfil',
    '/mapa-sistema',
    '/vales',
    '/metas-salao',
    '/fechamento-semanal',
    '/relatorio-completo',
  ],
  kiosk: [
    '/kiosk',
    '/kiosk/ponto',
  ],
};

/**
 * Check if a route matches any permission in the role's allowed routes
 */
function routeHasPermission(route: string, role: PinRole): boolean {
  const allowedRoutes = ROUTE_PERMISSIONS[role];
  const normalizedRoute = route.split('?')[0].replace(/\/$/, '') || '/';
  
  // Remove dynamic segments for comparison
  const baseRoute = normalizedRoute.replace(/\/:[^/]+/g, '');
  
  return allowedRoutes.some(allowed => {
    if (baseRoute === allowed) return true;
    if (baseRoute.startsWith(allowed + '/')) return true;
    // For dynamic routes like /profissional/:id, check base path
    const allowedBase = allowed.replace(/\/:[^/]+/g, '');
    if (baseRoute === allowedBase) return true;
    return false;
  });
}

/**
 * Get all roles that can access a route
 */
function getAllowedRoles(route: string): PinRole[] {
  const roles: PinRole[] = ['admin', 'notebook', 'kiosk'];
  return roles.filter(role => routeHasPermission(route, role));
}

export function useRouteHealthCheck(): RouteHealthReport {
  return useMemo(() => {
    const routes: RouteInfo[] = [];
    const summary: string[] = [];
    
    // Check protected routes
    APP_ROUTES.protected.forEach(path => {
      const isDynamic = path.includes(':');
      const allowedRoles = getAllowedRoles(path);
      const hasPermission = allowedRoles.length > 0;
      const issues: string[] = [];
      
      if (!hasPermission) {
        issues.push('Rota não encontrada em ROUTE_PERMISSIONS - adicione para permitir acesso');
      }
      
      // Check if admin doesn't have access (should always have)
      if (!allowedRoles.includes('admin')) {
        issues.push('Admin não tem acesso a esta rota - verifique ROUTE_PERMISSIONS');
      }
      
      routes.push({ path, isDynamic, hasPermission, allowedRoles, issues });
    });
    
    // Check kiosk routes
    APP_ROUTES.kiosk.forEach(path => {
      const isDynamic = path.includes(':');
      const allowedRoles = getAllowedRoles(path);
      const hasPermission = allowedRoles.length > 0;
      const issues: string[] = [];
      
      if (!allowedRoles.includes('kiosk')) {
        issues.push('Rota de kiosk não tem permissão para role kiosk');
      }
      
      routes.push({ path, isDynamic, hasPermission, allowedRoles, issues });
    });
    
    // Generate summary
    const routesWithIssues = routes.filter(r => r.issues.length > 0);
    const dynamicRoutes = routes.filter(r => r.isDynamic);
    
    if (routesWithIssues.length === 0) {
      summary.push('✅ Todas as rotas protegidas estão mapeadas corretamente');
    } else {
      summary.push(`⚠️ ${routesWithIssues.length} rota(s) com problemas encontradas`);
      routesWithIssues.forEach(r => {
        summary.push(`  - ${r.path}: ${r.issues.join(', ')}`);
      });
    }
    
    if (dynamicRoutes.length > 0) {
      summary.push(`📌 ${dynamicRoutes.length} rota(s) dinâmicas detectadas`);
    }
    
    // Log to console if debug flag is present
    if (typeof window !== 'undefined' && window.location.search.includes('debugRoutes=1')) {
      console.group('[Route Health Check]');
      console.log('Summary:', summary);
      console.table(routes.map(r => ({
        path: r.path,
        dynamic: r.isDynamic ? '✓' : '',
        admin: r.allowedRoles.includes('admin') ? '✓' : '✗',
        notebook: r.allowedRoles.includes('notebook') ? '✓' : '✗',
        kiosk: r.allowedRoles.includes('kiosk') ? '✓' : '✗',
        issues: r.issues.join('; ') || 'OK',
      })));
      console.groupEnd();
    }
    
    return {
      totalRoutes: routes.length,
      protectedRoutes: APP_ROUTES.protected.length,
      publicRoutes: APP_ROUTES.public.length,
      dynamicRoutes: dynamicRoutes.length,
      routesWithIssues: routesWithIssues.length,
      routes,
      summary,
    };
  }, []);
}
