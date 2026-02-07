/**
 * PIN-based authentication context
 * Replaces traditional login with 4-digit PIN system
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setDeviceMode, getDeviceModeSetting } from '@/lib/deviceType';

export type PinRole = 'admin' | 'notebook' | 'kiosk';

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
    '/profissionais',
    '/profissional', // Dynamic: /profissional/:id
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
    '/gestao-rh',
    '/vales',
    '/configuracoes',
    '/configuracoes/fiscal',
    '/configuracoes/whatsapp',
    '/configuracoes/integracoes',
    '/configuracoes/notificacoes',
    '/configuracoes/taxa-falta',
    '/configuracoes/caixa-pdv',
    '/configuracoes/metas',
    '/confirmacoes-whatsapp',
    '/atendimento-whatsapp',
    '/usuarios',
    '/perfil',
    '/ponto',
    '/tablet/cliente',
    '/mapa-sistema',
  ],
  notebook: [
    // Agenda + basic management (no financeiro, except vales)
    '/dashboard',
    '/agenda',
    '/atendimentos',
    '/clientes',
    '/profissionais',
    '/profissional', // Dynamic: /profissional/:id
    '/servicos',
    '/produtos',
    '/caixa',
    '/caixa/pdv',
    '/caixa/comandas',
    '/caixa/extrato',
    '/caixa/gaveta',
    '/financeiro/vales',
    '/vales',
    '/atendimento-whatsapp',
    '/confirmacoes-whatsapp',
    '/perfil',
  ],
  kiosk: [
    // Limited kiosk routes
    '/kiosk',
    '/kiosk/caixa',
    '/kiosk/caixa/comandas',
    '/kiosk/agenda',
    '/kiosk/ponto',
    '/kiosk/espelho-cliente',
    '/caixa',
    '/caixa/pdv',
    '/caixa/comandas',
    '/ponto',
    '/agenda',
    '/tablet/cliente',
  ],
};

// Default landing page by role
export const DEFAULT_ROUTES: Record<PinRole, string> = {
  admin: '/dashboard',
  notebook: '/agenda',
  kiosk: '/caixa',
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

      // Update last access time in database (fire and forget)
      supabase
        .from('pinos_acesso')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});

      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao verificar PIN' };
    }
  }, []);

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
