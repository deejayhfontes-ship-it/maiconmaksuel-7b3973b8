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
  Minus,
  Square,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import KioskAdminEscape from "@/components/kiosk/KioskAdminEscape";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoMaiconMaksuel from "@/assets/logo-maicon-maksuel.png";

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

  // Listen for comanda closure events via broadcast (multiple channels for compatibility)
  useEffect(() => {
    // Channel for kiosk-specific events
    const kioskChannel = supabase
      .channel('kiosk-comanda')
      .on('broadcast', { event: 'comanda-fechada' }, ({ payload }) => {
        if (import.meta.env.DEV) console.log('KIOSK_EVT_RECEIVED', { channel: 'kiosk-comanda', event: 'comanda-fechada', payload });
        if (payload) {
          const data = payload as ComandaData;
          if (import.meta.env.DEV) console.log('KIOSK_SHOW_RESUMO', { itens: data.itens, total: data.total, cliente: data.cliente });
          if (import.meta.env.DEV) console.log('KIOSK_SHOW_PAGAMENTOS', { formaPagamento: data.formaPagamento });
          setComanda(data);
          setKioskState('comanda');
        }
      })
      .on('broadcast', { event: 'pagamento-confirmado' }, () => {
        if (import.meta.env.DEV) console.log('KIOSK_EVT_RECEIVED', { channel: 'kiosk-comanda', event: 'pagamento-confirmado' });
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

    // Channel for tablet-comanda events (from PagamentoModal/FecharComandaModal)
    const tabletChannel = supabase
      .channel('tablet-comanda')
      .on('broadcast', { event: 'comanda-update' }, ({ payload }) => {
        if (import.meta.env.DEV) console.log('KIOSK_EVT_RECEIVED', { channel: 'tablet-comanda', event: 'comanda-update', payload });
        if (payload) {
          const data = payload as any;
          // Map from tablet format to our format
          const comandaData: ComandaData = {
            numero: data.numero,
            cliente: data.cliente || 'Cliente',
            itens: data.itens || [],
            subtotal: data.subtotal || 0,
            desconto: data.desconto || 0,
            total: data.total || 0,
            formaPagamento: data.formaPagamento,
          };
          
          if (data.status === 'fechando') {
            if (import.meta.env.DEV) console.log('KIOSK_SHOW_RESUMO', { itens: comandaData.itens, total: comandaData.total, cliente: comandaData.cliente });
            if (import.meta.env.DEV) console.log('KIOSK_SHOW_PAGAMENTOS', { formaPagamento: comandaData.formaPagamento });
            setComanda(comandaData);
            setKioskState('comanda');
          } else if (data.status === 'finalizado') {
            setKioskState('thankyou');
            if (autoReturnTimeoutRef.current) {
              clearTimeout(autoReturnTimeoutRef.current);
            }
            autoReturnTimeoutRef.current = setTimeout(() => {
              setKioskState('idle');
              setComanda(null);
            }, thankYouDuration);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kioskChannel);
      supabase.removeChannel(tabletChannel);
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

  // Window controls component - minimalist style
  const WindowControls = () => (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1 opacity-30 hover:opacity-60 transition-opacity">
      <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
        <Minus className="h-3 w-3 text-gray-600" />
      </button>
      <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
        <Square className="h-3 w-3 text-gray-600" />
      </button>
      <button className="p-1.5 hover:bg-red-100 rounded transition-colors group">
        <X className="h-3 w-3 text-gray-600 group-hover:text-red-500" />
      </button>
    </div>
  );

  // THANK YOU STATE - Modern premium design
  if (kioskState === 'thankyou') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-primary/5 to-white p-8 relative">
        <WindowControls />
        
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
            "font-bold text-gray-900 mb-6 leading-tight",
            settings.tipografia_grande ? "text-4xl" : "text-3xl"
          )}>
            Obrigado pela preferência!
          </h1>
          <p className={cn(
            "text-gray-500 mb-10",
            settings.tipografia_grande ? "text-2xl" : "text-xl"
          )}>
            Volte Sempre!
          </p>
          
          {/* Logo */}
          <img 
            src={logoMaiconMaksuel} 
            alt="Maicon Maksuel"
            className="h-16 w-auto mx-auto object-contain opacity-70"
          />
          
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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 select-none relative">
        <WindowControls />
        
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

  // IDLE STATE - Modern premium design with animated logo
  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative",
      "bg-gradient-to-br from-white via-gray-50 to-white"
    )}>
      <WindowControls />
      
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

      {/* Main content - Centered logo with clock below */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-8">
        {/* Logo Section with Animation */}
        <div className="mb-6">
          <div className="relative">
            {/* Animated glow rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="absolute w-56 h-56 rounded-full border-2 border-primary/20"
                style={{ animation: 'pulse-ring 3s ease-out infinite' }}
              />
              <div 
                className="absolute w-48 h-48 rounded-full border-2 border-primary/30"
                style={{ animation: 'pulse-ring 3s ease-out infinite', animationDelay: '1s' }}
              />
              <div 
                className="absolute w-40 h-40 rounded-full border-2 border-primary/40"
                style={{ animation: 'pulse-ring 3s ease-out infinite', animationDelay: '2s' }}
              />
            </div>
            
            {/* Logo with breathing animation - wrapped in admin escape */}
            <KioskAdminEscape>
              <img 
                src={logoMaiconMaksuel} 
                alt="Maicon Maksuel"
                className={cn(
                  "relative h-40 w-auto md:h-48 object-contain drop-shadow-2xl z-10",
                )}
                style={{ animation: 'logo-breathe 4s ease-in-out infinite' }}
              />
            </KioskAdminEscape>
          </div>
        </div>

        {/* Clock - smaller and below logo */}
        <div className={cn(
          "font-extralight tracking-tight text-muted-foreground/60",
          settings.tipografia_grande ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
        )}>
          {formatTime(currentTime)}
        </div>

        {/* Ponto Button - Minimal icon in corner for employees */}
        {settings.ponto_habilitado && (
          <button
            onClick={() => navigate('/kiosk/ponto')}
            className={cn(
              "fixed bottom-6 right-6 p-3 rounded-full",
              "text-gray-300 hover:text-primary hover:bg-primary/5",
              "transition-all duration-300",
              "active:scale-95 touch-manipulation",
              settings.alvos_touch_grandes && "p-4"
            )}
            title="Registrar Ponto"
          >
            <Fingerprint className={cn(
              "transition-colors",
              settings.alvos_touch_grandes ? "h-6 w-6" : "h-5 w-5"
            )} />
          </button>
        )}
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
        
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        
        @keyframes logo-breathe {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 4px 20px rgba(0,0,0,0.1));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 8px 30px rgba(0,0,0,0.15));
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
