/**
 * Kiosk Home Page - Client-Facing Display
 * 
 * Three states:
 * 1. IDLE: Logo + branding + clock + ponto button
 * 2. COMANDA CONFIRMATION: Read-only summary after comanda closure
 * 3. THANK YOU: Brief message after payment
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useSalonSettings } from "@/contexts/SalonSettingsContext";
import { cn } from "@/lib/utils";
import { 
  Check, 
  Fingerprint, 
  Clock,
  Monitor,
  QrCode,
  CreditCard,
  Banknote,
  Receipt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface for comanda items
interface ComandaItem {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  profissional?: string;
}

// Interface for comanda data
interface ComandaData {
  numero: number;
  cliente: string;
  itens: ComandaItem[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento?: string;
}

type KioskState = 'idle' | 'comanda' | 'thankyou';

export default function KioskHome() {
  const navigate = useNavigate();
  const { settings } = useKioskSettings();
  const { salonData } = useSalonSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kioskState, setKioskState] = useState<KioskState>('idle');
  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const autoReturnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss configuration (configurable in settings)
  const autoDismissSeconds = 8;

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for comanda closure events via broadcast
  useEffect(() => {
    const channel = supabase
      .channel('kiosk-comanda')
      .on('broadcast', { event: 'comanda-fechada' }, ({ payload }) => {
        if (payload) {
          setComanda(payload as ComandaData);
          setKioskState('comanda');
        }
      })
      .on('broadcast', { event: 'pagamento-confirmado' }, () => {
        setKioskState('thankyou');
        // Auto-return to idle after delay
        if (autoReturnTimeoutRef.current) {
          clearTimeout(autoReturnTimeoutRef.current);
        }
        autoReturnTimeoutRef.current = setTimeout(() => {
          setKioskState('idle');
          setComanda(null);
        }, 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (autoReturnTimeoutRef.current) {
        clearTimeout(autoReturnTimeoutRef.current);
      }
    };
  }, []);

  // Auto-dismiss comanda screen after configurable time
  useEffect(() => {
    if (kioskState === 'comanda') {
      if (autoReturnTimeoutRef.current) {
        clearTimeout(autoReturnTimeoutRef.current);
      }
      autoReturnTimeoutRef.current = setTimeout(() => {
        setKioskState('thankyou');
        setTimeout(() => {
          setKioskState('idle');
          setComanda(null);
        }, 5000);
      }, autoDismissSeconds * 1000);
    }

    return () => {
      if (autoReturnTimeoutRef.current) {
        clearTimeout(autoReturnTimeoutRef.current);
      }
    };
  }, [kioskState]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Get payment icon and styling
  const getPaymentInfo = (forma: string) => {
    switch (forma?.toLowerCase()) {
      case 'pix':
        return { icon: QrCode, label: 'PIX', bgClass: 'bg-teal-500/10', textClass: 'text-teal-500' };
      case 'dinheiro':
        return { icon: Banknote, label: 'Dinheiro', bgClass: 'bg-green-500/10', textClass: 'text-green-500' };
      case 'credito':
      case 'crédito':
        return { icon: CreditCard, label: 'Cartão de Crédito', bgClass: 'bg-blue-500/10', textClass: 'text-blue-500' };
      case 'debito':
      case 'débito':
        return { icon: CreditCard, label: 'Cartão de Débito', bgClass: 'bg-purple-500/10', textClass: 'text-purple-500' };
      default:
        return { icon: Receipt, label: forma || 'Pagamento', bgClass: 'bg-muted', textClass: 'text-muted-foreground' };
    }
  };

  // Logo component with animation
  const LogoDisplay = () => {
    const logoUrl = settings.logo_url || salonData?.logo_url;
    
    return (
      <div className="relative">
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl animate-pulse"
          style={{ animationDuration: '3s' }}
        />
        
        <div 
          className="relative"
          style={{
            animation: settings.logo_animacao === 'pulse' 
              ? 'pulse 2s ease-in-out infinite' 
              : settings.logo_animacao === 'fade' 
              ? 'fadeInUp 1s ease-out forwards'
              : 'floating 6s ease-in-out infinite'
          }}
        >
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={salonData?.nome_salao || "Salão"}
              className={cn(
                "h-48 w-auto rounded-3xl shadow-2xl border-4 border-white/20 object-contain",
                settings.tipografia_grande && "h-56"
              )}
            />
          ) : (
            <div className={cn(
              "h-48 w-48 rounded-3xl bg-primary/10 flex items-center justify-center shadow-2xl border-4 border-white/20",
              settings.tipografia_grande && "h-56 w-56"
            )}>
              <Monitor className="h-24 w-24 text-primary" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // THANK YOU STATE
  if (kioskState === 'thankyou') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center animate-fade-in">
          <div className="w-32 h-32 mx-auto mb-8 bg-green-500/10 rounded-full flex items-center justify-center animate-scale-in">
            <Check className="h-16 w-16 text-green-500" />
          </div>
          <h1 className={cn(
            "font-bold text-foreground mb-4",
            settings.tipografia_grande ? "text-6xl" : "text-5xl"
          )}>
            Obrigado pela preferência!
          </h1>
          <p className={cn(
            "text-muted-foreground",
            settings.tipografia_grande ? "text-3xl" : "text-2xl"
          )}>
            Volte sempre!
          </p>
        </div>
      </div>
    );
  }

  // COMANDA CONFIRMATION STATE
  if (kioskState === 'comanda' && comanda) {
    const paymentInfo = comanda.formaPagamento ? getPaymentInfo(comanda.formaPagamento) : null;
    const PaymentIcon = paymentInfo?.icon;

    return (
      <div className="min-h-screen flex flex-col p-6 select-none">
        {/* Header with logo and time */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {(settings.logo_url || salonData?.logo_url) && (
              <img 
                src={settings.logo_url || salonData?.logo_url!} 
                alt="Logo" 
                className="h-14 w-auto rounded-lg shadow-md object-contain"
              />
            )}
            <div>
              <h1 className={cn(
                "font-semibold text-foreground",
                settings.tipografia_grande ? "text-xl" : "text-lg"
              )}>
                {salonData?.nome_salao || "Salão de Beleza"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className={cn(
            "font-bold text-primary tabular-nums",
            settings.tipografia_grande ? "text-3xl" : "text-2xl"
          )}>
            {formatTime(currentTime)}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex gap-6 animate-fade-in">
          {/* Left - Services Summary */}
          <div className="flex-1 bg-card rounded-2xl shadow-lg border overflow-hidden flex flex-col">
            <div className="p-6 bg-primary/5 border-b">
              <h2 className={cn(
                "font-bold text-foreground",
                settings.tipografia_grande ? "text-2xl" : "text-xl"
              )}>
                Resumo do Atendimento
              </h2>
              <p className="text-muted-foreground mt-1">
                Comanda #{comanda.numero} • {comanda.cliente}
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="space-y-3">
                {comanda.itens.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium text-foreground",
                        settings.tipografia_grande ? "text-xl" : "text-lg"
                      )}>
                        {item.nome}
                      </p>
                      {item.profissional && (
                        <p className="text-sm text-muted-foreground">
                          com {item.profissional}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold text-foreground",
                        settings.tipografia_grande ? "text-xl" : "text-lg"
                      )}>
                        {formatCurrency(item.valorUnitario * item.quantidade)}
                      </p>
                      {item.quantidade > 1 && (
                        <p className="text-sm text-muted-foreground">
                          {item.quantidade}x {formatCurrency(item.valorUnitario)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Section */}
            <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-t">
              {comanda.desconto > 0 && (
                <>
                  <div className="flex justify-between mb-2 text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(comanda.subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-3 text-green-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(comanda.desconto)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className={cn(
                  "font-bold text-foreground",
                  settings.tipografia_grande ? "text-3xl" : "text-2xl"
                )}>
                  TOTAL
                </span>
                <span className={cn(
                  "font-bold text-primary",
                  settings.tipografia_grande ? "text-5xl" : "text-4xl"
                )}>
                  {formatCurrency(comanda.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Right - Payment Info */}
          <div className="w-80 flex flex-col gap-6">
            {/* Payment Method */}
            {paymentInfo && PaymentIcon && (
              <div className="bg-card rounded-2xl shadow-lg border p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                  Forma de Pagamento
                </h3>
                <div className={cn(
                  "p-6 rounded-xl flex flex-col items-center",
                  paymentInfo.bgClass
                )}>
                  <PaymentIcon className={cn("h-12 w-12 mb-3", paymentInfo.textClass)} />
                  <p className={cn(
                    "font-bold text-center",
                    paymentInfo.textClass,
                    settings.tipografia_grande ? "text-2xl" : "text-xl"
                  )}>
                    {paymentInfo.label}
                  </p>
                </div>
              </div>
            )}

            {/* Logo */}
            <div className="flex-1 flex items-center justify-center">
              {(settings.logo_url || salonData?.logo_url) && (
                <img 
                  src={settings.logo_url || salonData?.logo_url!} 
                  alt="Logo" 
                  className="max-h-32 w-auto opacity-50 grayscale"
                />
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // IDLE STATE - Default view with logo, clock, and ponto button
  return (
    <div className="min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '4s' }} 
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '6s', animationDelay: '2s' }} 
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <LogoDisplay />
        </div>

        {/* Salon name */}
        <h1 
          className={cn(
            "font-bold text-foreground mb-2 opacity-0",
            settings.tipografia_grande ? "text-5xl" : "text-4xl"
          )}
          style={{ animation: 'fadeInUp 1s ease-out 0.5s forwards' }}
        >
          {salonData?.nome_salao || "Salão de Beleza"}
        </h1>
        {salonData?.nome_fantasia && (
          <p 
            className={cn(
              "text-muted-foreground mb-12 opacity-0",
              settings.tipografia_grande ? "text-2xl" : "text-xl"
            )}
            style={{ animation: 'fadeInUp 1s ease-out 0.7s forwards' }}
          >
            {salonData.nome_fantasia}
          </p>
        )}

        {/* Clock */}
        <div 
          className={cn(
            "font-bold text-primary tabular-nums mb-16 opacity-0",
            settings.tipografia_grande ? "text-7xl" : "text-6xl"
          )}
          style={{ 
            animation: 'fadeInUp 1s ease-out 0.9s forwards',
            textShadow: '0 4px 20px rgba(var(--primary), 0.3)'
          }}
        >
          {formatTime(currentTime)}
        </div>

        {/* Ponto Button */}
        {settings.ponto_habilitado && (
          <button
            onClick={() => navigate('/kiosk/ponto')}
            className={cn(
              "group flex flex-col items-center gap-3 p-6 rounded-2xl",
              "transition-all duration-500 hover:bg-card/50 hover:shadow-xl",
              "opacity-0 touch-manipulation active:scale-95",
              settings.alvos_touch_grandes && "p-8"
            )}
            style={{ animation: 'fadeInUp 1s ease-out 1.1s forwards' }}
          >
            <div 
              className={cn(
                "rounded-full bg-primary/10 flex items-center justify-center",
                "transition-all duration-300 group-hover:bg-primary group-hover:scale-110",
                settings.alvos_touch_grandes ? "w-20 h-20" : "w-16 h-16"
              )}
            >
              <Fingerprint className={cn(
                "text-primary transition-colors group-hover:text-primary-foreground",
                settings.alvos_touch_grandes ? "h-10 w-10" : "h-8 w-8"
              )} />
            </div>
            <span className={cn(
              "text-muted-foreground font-medium transition-colors group-hover:text-foreground",
              settings.tipografia_grande ? "text-lg" : "text-sm"
            )}>
              Registrar Ponto
            </span>
          </button>
        )}
      </div>

      {/* Subtle footer */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Clock className="h-3 w-3" />
          <span>
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes floating {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
