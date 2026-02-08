/**
 * PIN-based authentication context
 * Replaces traditional login with 4-digit PIN system
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setDeviceMode, getDeviceModeSetting } from '@/lib/deviceType';

export type PinRole = 'admin' | 'notebook' | 'kiosk' | 'colaborador_agenda';

export interface PinSession {
  id: string;
  pin: string;
  nome: string;
  role: PinRole;
  descricao?: string;
  loginTime: string;
}

// Route permissions by role
export const ROUTE_PERMISSIONS: Record<PinRole, string[]> = {
  admin: [
    // Full access to all routes
    '/dashboard',
    '/agenda',
    '/atendimentos',
    '/clientes',
    '/profissionais', // Dynamic: /profissionais/:id also
    '/profissional', // Legacy: /profissional/:id
    '/servicos',
    '/produtos',
    '/caixa',
    '/caixa/pdv',
    '/caixa/comandas',
    '/caixa/extrato',
    '/caixa/fechar',
    '/caixa/gaveta',
    '/caixa/historico',
    '/caixa/dividas',
    '/caixa/gorjetas',
    '/financeiro',
    '/financeiro/fechamento-semanal',
    '/financeiro/dividas',
    '/financeiro/cheques',
    '/financeiro/vales',
    '/notas-fiscais',
    '/nota-fiscal', // Dynamic: /nota-fiscal/:id
    '/relatorios',
    '/relatorios/completo',
    '/relatorio-completo',
    '/fechamento-semanal',
    '/metas-salao',
    // RH - Full access
    '/gestao-rh',
    '/gestao-rh/funcionarios',
    '/gestao-rh/ponto',
    '/gestao-rh/folha',
    '/gestao-rh/comissoes',
    '/gestao-rh/ferias',
    '/gestao-rh/relatorios',
    '/gestao-rh/configuracoes',
    '/vales',
    '/configuracoes',
    '/configuracoes/fiscal',
    '/configuracoes/whatsapp',
    '/configuracoes/integracoes',
    '/configuracoes/notificacoes',
    '/configuracoes/alertas',
    '/configuracoes/taxa-falta',
    '/configuracoes/caixa-pdv',
    '/configuracoes/metas',
    '/configuracoes/rh',
    '/confirmacoes-whatsapp',
    '/atendimento-whatsapp',
    '/whatsapp',
    '/usuarios',
    '/perfil',
    '/ponto',
    '/tablet/cliente',
    '/mapa-sistema',
    // Kiosk routes (admin can access for testing)
    '/kiosk',
    '/kiosk/ponto',
    '/kiosk/caixa',
    '/kiosk/caixa/comandas',
    '/kiosk/agenda',
    '/kiosk/espelho-cliente',
  ],
  notebook: [
    // Agenda + basic management (NO caixa, NO vales, NO faturamento, NO whatsapp, NO RH sensitive)
    '/dashboard',
    '/agenda',
    '/atendimentos',
    '/clientes',
    '/profissionais', // Dynamic: /profissionais/:id also
    '/profissional', // Legacy: /profissional/:id
    '/servicos',
    '/produtos',
    '/perfil',
    // RH - View only (no config, no payroll processing)
    '/gestao-rh',
    '/gestao-rh/ponto',
  ],
  kiosk: [
    // Kiosk routes - LIMITED to client-facing display + ponto only
    // NO full caixa access - kiosk is visualization only
    '/kiosk',
    '/kiosk/ponto',
    '/ponto',
    // Agenda is read-only in kiosk context (handled by component)
    '/agenda',
  ],
  colaborador_agenda: [
    // Ultra-restricted: ONLY agenda read-only
    '/agenda',
  ],
};

// Default landing page by role
export const DEFAULT_ROUTES: Record<PinRole, string> = {
  admin: '/dashboard',
  notebook: '/agenda',
  kiosk: '/caixa',
  colaborador_agenda: '/agenda',
};

interface PinAuthContextType {
  session: PinSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccessRoute: (route: string) => boolean;
  getDefaultRoute: () => string;
}

const PinAuthContext = createContext<PinAuthContextType | undefined>(undefined);

const SESSION_KEY = 'mm-pin-session';
const SESSION_EXPIRY_HOURS = 12;

export function PinAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PinSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed: PinSession = JSON.parse(stored);
          
          // Check if session is expired
          const loginTime = new Date(parsed.loginTime);
          const now = new Date();
          const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < SESSION_EXPIRY_HOURS) {
            setSession(parsed);
            // Restore device mode based on role
            if (parsed.role === 'kiosk') {
              setDeviceMode('kiosk');
            } else if (parsed.role === 'notebook') {
              setDeviceMode('notebook');
            } else {
              setDeviceMode('auto');
            }
          } else {
            // Session expired
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'PIN deve ter 4 dígitos' };
    }

    try {
      // Query the pinos_acesso table
      const { data, error } = await supabase
        .from('pinos_acesso')
        .select('id, pin, nome, role, descricao')
        .eq('pin', pin)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        // Log failed attempt
        await logAccessAttempt(null, pin, false, 'PIN inválido ou inativo');
        return { success: false, error: 'PIN inválido ou inativo' };
      }

      // Create session
      const newSession: PinSession = {
        id: data.id,
        pin: data.pin,
        nome: data.nome,
        role: data.role as PinRole,
        descricao: data.descricao || undefined,
        loginTime: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);

      // Set device mode based on role
      if (newSession.role === 'kiosk') {
        setDeviceMode('kiosk');
      } else if (newSession.role === 'notebook') {
        setDeviceMode('notebook');
      } else {
        setDeviceMode('auto');
      }

      // Update last access time in database
      supabase
        .from('pinos_acesso')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});

      // Log successful access
      await logAccessAttempt(data.id, data.nome, true, null, data.role);

      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao verificar PIN' };
    }
  }, []);

  // Helper to log access attempts
  const logAccessAttempt = async (
    pinoId: string | null,
    nomeUsuario: string,
    sucesso: boolean,
    motivoFalha: string | null,
    role: string = 'unknown'
  ) => {
    try {
      await supabase.from('logs_acesso').insert([{
        pino_id: pinoId,
        nome_usuario: nomeUsuario,
        role: role,
        dispositivo: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
        user_agent: navigator.userAgent,
        sucesso,
        motivo_falha: motivoFalha,
      }]);
    } catch (e) {
      console.error('Failed to log access attempt:', e);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setDeviceMode('auto');
  }, []);

  const canAccessRoute = useCallback((route: string): boolean => {
    if (!session) return false;

    const allowedRoutes = ROUTE_PERMISSIONS[session.role];
    
    // Normalize route (remove trailing slash, query params)
    const normalizedRoute = route.split('?')[0].replace(/\/$/, '') || '/';
    
    // Check exact match or if route starts with allowed route (for dynamic routes)
    return allowedRoutes.some(allowed => {
      // Exact match
      if (normalizedRoute === allowed) return true;
      // Dynamic routes like /profissional/:id or /nota-fiscal/:id
      if (normalizedRoute.startsWith(allowed + '/')) return true;
      return false;
    });
  }, [session]);

  const getDefaultRoute = useCallback((): string => {
    if (!session) return '/login';
    return DEFAULT_ROUTES[session.role];
  }, [session]);

  return (
    <PinAuthContext.Provider
      value={{
        session,
        loading,
        isAuthenticated: !!session,
        login,
        logout,
        canAccessRoute,
        getDefaultRoute,
      }}
    >
      {children}
    </PinAuthContext.Provider>
  );
}

export function usePinAuth() {
  const context = useContext(PinAuthContext);
  if (context === undefined) {
    throw new Error('usePinAuth must be used within a PinAuthProvider');
  }
  return context;
}
