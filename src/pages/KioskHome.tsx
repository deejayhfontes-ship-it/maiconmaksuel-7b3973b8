/**
 * Kiosk Home Page - Modern Premium Client-Facing Display
 * 
 * Three states:
 * 1. IDLE: Elegant branding with logo, clock, and ponto button
 * 2. COMANDA CONFIRMATION: Modern card-based summary after closure
 * 3. THANK YOU: Premium gratitude message with salon branding
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
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  Sparkles,
  Heart,
  AlertCircle
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

  // Get configurable timeouts from settings with defaults
  const autoDismissSeconds = 10;
  const thankYouDuration = 6000;

  // Get logo URL - prioritize kiosk settings, fallback to salon
  const logoUrl = settings.logo_url || salonData?.logo_url;
  const salonName = salonData?.nome_salao || "Salão de Beleza";

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
        if (autoReturnTimeoutRef.current) {
          clearTimeout(autoReturnTimeoutRef.current);
        }
        autoReturnTimeoutRef.current = setTimeout(() => {
          setKioskState('idle');
          setComanda(null);
        }, thankYouDuration);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (autoReturnTimeoutRef.current) {
        clearTimeout(autoReturnTimeoutRef.current);
      }
    };
  }, [thankYouDuration]);

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
        }, thankYouDuration);
      }, autoDismissSeconds * 1000);
    }

    return () => {
      if (autoReturnTimeoutRef.current) {
        clearTimeout(autoReturnTimeoutRef.current);
      }
    };
  }, [kioskState, thankYouDuration]);

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
        return { icon: QrCode, label: 'PIX', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' };
      case 'dinheiro':
        return { icon: Banknote, label: 'Dinheiro', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'credito':
      case 'crédito':
        return { icon: CreditCard, label: 'Cartão de Crédito', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'debito':
      case 'débito':
        return { icon: CreditCard, label: 'Cartão de Débito', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
      default:
        return { icon: Receipt, label: forma || 'Pagamento', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  // Logo animation class based on settings
  const getLogoAnimationClass = () => {
    switch (settings.logo_animacao) {
      case 'pulse': return 'animate-pulse';
      case 'fade': return 'animate-fade-in';
      default: return '';
    }
  };

  // THANK YOU STATE - Modern premium design
  if (kioskState === 'thankyou') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-primary/5 to-white p-8">
        <div className="text-center animate-fade-in max-w-lg">
          {/* Success Icon with animation */}
          <div className="relative mb-10">
            <div className="absolute inset-0 w-36 h-36 mx-auto rounded-full bg-green-100 animate-ping opacity-20" />
            <div className="relative w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-200">
              <Check className="h-20 w-20 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          {/* Thank you message */}
          <h1 className={cn(
            "font-bold text-gray-900 mb-4 leading-tight",
            settings.tipografia_grande ? "text-5xl" : "text-4xl"
          )}>
            Obrigado pela preferência!
          </h1>
          <p className={cn(
            "text-gray-500 mb-10",
            settings.tipografia_grande ? "text-2xl" : "text-xl"
          )}>
            Volte sempre ao {salonName}
          </p>
          
          {/* Logo */}
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={salonName}
              className="h-16 w-auto mx-auto object-contain opacity-60"
            />
          )}
          
          {/* Hearts decoration */}
          <div className="mt-8 flex justify-center gap-3 opacity-40">
            <Heart className="h-5 w-5 text-pink-400 animate-pulse" fill="currentColor" style={{ animationDelay: '0ms' }} />
            <Heart className="h-5 w-5 text-pink-400 animate-pulse" fill="currentColor" style={{ animationDelay: '200ms' }} />
            <Heart className="h-5 w-5 text-pink-400 animate-pulse" fill="currentColor" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // COMANDA CONFIRMATION STATE - Modern card layout
  if (kioskState === 'comanda' && comanda) {
    const paymentInfo = comanda.formaPagamento ? getPaymentInfo(comanda.formaPagamento) : null;
    const PaymentIcon = paymentInfo?.icon;

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 select-none">
        {/* Header with logo and time */}
        <header className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={salonName}
                className="h-12 w-auto rounded-xl shadow-sm object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className={cn(
                "font-bold text-gray-900",
                settings.tipografia_grande ? "text-xl" : "text-lg"
              )}>
                {salonName}
              </h1>
              <p className="text-sm text-gray-400">
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
          {/* Left - Services Summary Card */}
          <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className={cn(
                    "font-bold text-gray-900",
                    settings.tipografia_grande ? "text-2xl" : "text-xl"
                  )}>
                    Resumo do Atendimento
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Comanda #{comanda.numero} • {comanda.cliente}
                  </p>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="space-y-3">
                {comanda.itens.map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-1">
                      <p className={cn(
                        "font-semibold text-gray-900",
                        settings.tipografia_grande ? "text-xl" : "text-lg"
                      )}>
                        {item.nome}
                      </p>
                      {item.profissional && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          com {item.profissional}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-gray-900",
                        settings.tipografia_grande ? "text-xl" : "text-lg"
                      )}>
                        {formatCurrency(item.valorUnitario * item.quantidade)}
                      </p>
                      {item.quantidade > 1 && (
                        <p className="text-sm text-gray-400">
                          {item.quantidade}x {formatCurrency(item.valorUnitario)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Section */}
            <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t border-gray-100">
              {comanda.desconto > 0 && (
                <>
                  <div className="flex justify-between mb-2 text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(comanda.subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-4 text-green-600">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      Desconto
                    </span>
                    <span>-{formatCurrency(comanda.desconto)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-primary/10">
                <span className={cn(
                  "font-bold text-gray-900",
                  settings.tipografia_grande ? "text-2xl" : "text-xl"
                )}>
                  TOTAL
                </span>
                <span className={cn(
                  "font-black text-primary",
                  settings.tipografia_grande ? "text-5xl" : "text-4xl"
                )}>
                  {formatCurrency(comanda.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Right - Payment Info & Branding */}
          <div className="w-80 flex flex-col gap-6">
            {/* Payment Method Card */}
            {paymentInfo && PaymentIcon && (
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                  Forma de Pagamento
                </h3>
                <div className={cn(
                  "p-6 rounded-2xl flex flex-col items-center border",
                  paymentInfo.bg,
                  paymentInfo.border
                )}>
                  <PaymentIcon className={cn("h-14 w-14 mb-3", paymentInfo.color)} />
                  <p className={cn(
                    "font-bold text-center",
                    paymentInfo.color,
                    settings.tipografia_grande ? "text-xl" : "text-lg"
                  )}>
                    {paymentInfo.label}
                  </p>
                </div>
              </div>
            )}

            {/* Salon Branding */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 flex flex-col items-center justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={salonName}
                  className="max-h-24 w-auto opacity-30 grayscale"
                />
              ) : (
                <div className="text-center opacity-30">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{salonName}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // IDLE STATE - Modern premium design
  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative",
      "bg-gradient-to-br from-white via-gray-50 to-white"
    )}>
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"
          style={{ animation: 'float 20s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl"
          style={{ animation: 'float 25s ease-in-out infinite', animationDelay: '-10s' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-100/50 rounded-full blur-3xl"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-8">
        {/* Logo Section */}
        <div className="mb-10">
          {logoUrl ? (
            <div className="relative">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-2xl scale-110" />
              <img 
                src={logoUrl} 
                alt={salonName}
                className={cn(
                  "relative h-40 w-auto rounded-3xl shadow-2xl shadow-gray-300/50 object-contain bg-white/50 backdrop-blur-sm p-3",
                  settings.tipografia_grande && "h-48",
                  getLogoAnimationClass()
                )}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className={cn(
                "rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-2xl shadow-primary/20 mb-4",
                settings.tipografia_grande ? "h-48 w-48" : "h-40 w-40"
              )}>
                <Sparkles className={cn(
                  "text-primary",
                  settings.tipografia_grande ? "h-24 w-24" : "h-20 w-20"
                )} />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full border border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-700">Logo do salão não configurada</span>
              </div>
            </div>
          )}
        </div>

        {/* Salon name */}
        <h1 
          className={cn(
            "font-black text-gray-900 mb-2 text-center leading-tight",
            settings.tipografia_grande ? "text-5xl" : "text-4xl"
          )}
        >
          {salonName}
        </h1>
        {salonData?.nome_fantasia && salonData.nome_fantasia !== salonName && (
          <p 
            className={cn(
              "text-gray-500 mb-8 text-center",
              settings.tipografia_grande ? "text-xl" : "text-lg"
            )}
          >
            {salonData.nome_fantasia}
          </p>
        )}

        {/* Clock */}
        <div 
          className={cn(
            "font-black text-primary tabular-nums mb-16 tracking-tight",
            settings.tipografia_grande ? "text-8xl" : "text-7xl"
          )}
          style={{ 
            textShadow: '0 4px 30px rgba(var(--primary), 0.15)'
          }}
        >
          {formatTime(currentTime)}
        </div>

        {/* Ponto Button */}
        {settings.ponto_habilitado && (
          <button
            onClick={() => navigate('/kiosk/ponto')}
            className={cn(
              "group flex items-center gap-4 px-8 py-5 rounded-2xl",
              "bg-white shadow-xl shadow-gray-200/50 border border-gray-100",
              "transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1",
              "active:scale-95 touch-manipulation",
              settings.alvos_touch_grandes && "px-10 py-6"
            )}
          >
            <div 
              className={cn(
                "rounded-xl bg-primary/10 flex items-center justify-center",
                "transition-all duration-300 group-hover:bg-primary group-hover:scale-110",
                settings.alvos_touch_grandes ? "w-16 h-16" : "w-14 h-14"
              )}
            >
              <Fingerprint className={cn(
                "text-primary transition-colors group-hover:text-white",
                settings.alvos_touch_grandes ? "h-8 w-8" : "h-7 w-7"
              )} />
            </div>
            <div className="text-left">
              <p className={cn(
                "font-bold text-gray-900",
                settings.tipografia_grande ? "text-xl" : "text-lg"
              )}>
                Registrar Ponto
              </p>
              <p className="text-sm text-gray-500">
                Entrada, saída e intervalos
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Footer with date */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
