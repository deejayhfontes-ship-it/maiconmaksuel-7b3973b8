import { useState, useEffect, useRef } from "react";
import { QrCode, CreditCard, Clock, Check, Loader2, Fingerprint, Banknote, Receipt, ChevronRight, User, Printer, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoMaicon from "@/assets/logo-maicon.jpg";

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
  status: "aguardando" | "em_atendimento" | "fechando" | "finalizado";
  itens: ComandaItem[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento?: string;
}

// Interface for professionals
interface Profissional {
  id: string;
  nome: string;
  foto_url?: string | null;
  especialidade?: string | null;
}

// Interface for ponto registro
interface PontoRegistro {
  id: string;
  entrada_manha: string | null;
  saida_almoco: string | null;
  entrada_tarde: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
}

// Interface for comprovante
interface Comprovante {
  nome: string;
  data: string;
  tipo: string;
  hora: string;
  registro: PontoRegistro | null;
}

export default function TabletCliente() {
  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const [showFinalizado, setShowFinalizado] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPontoModal, setShowPontoModal] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [pontoLoading, setPontoLoading] = useState(false);
  const [pontoHoje, setPontoHoje] = useState<PontoRegistro | null>(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);
  const comprovanteRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load profissionais for ponto
  useEffect(() => {
    const loadProfissionais = async () => {
      const { data } = await supabase
        .from('profissionais')
        .select('id, nome, foto_url, especialidade')
        .eq('ativo', true)
        .order('nome');
      
      if (data) {
        setProfissionais(data);
      }
    };
    loadProfissionais();
  }, []);

  // Load ponto for selected profissional
  useEffect(() => {
    if (selectedProfissional) {
      loadPontoHoje();
    } else {
      setPontoHoje(null);
    }
  }, [selectedProfissional]);

  const loadPontoHoje = async () => {
    if (!selectedProfissional) return;

    const hoje = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('ponto_registros')
      .select('id, entrada_manha, saida_almoco, entrada_tarde, saida, horas_trabalhadas')
      .eq('pessoa_id', selectedProfissional.id)
      .eq('tipo_pessoa', 'profissional')
      .eq('data', hoje)
      .single();

    setPontoHoje(data || null);
  };

  // Listen for comanda updates (in production, use Supabase realtime)
  useEffect(() => {
    // Simulate receiving comanda data from the system
    const channel = supabase
      .channel('tablet-comanda')
      .on('broadcast', { event: 'comanda-update' }, ({ payload }) => {
        if (payload) {
          setComanda(payload as ComandaData);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle finalized state
  useEffect(() => {
    if (comanda?.status === "finalizado") {
      setShowFinalizado(true);
      const timeout = setTimeout(() => {
        setShowFinalizado(false);
        setComanda(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [comanda?.status]);

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

  // Get payment icon and color
  const getPaymentInfo = (forma: string) => {
    switch (forma?.toLowerCase()) {
      case 'pix':
        return { icon: QrCode, label: 'PIX', color: 'bg-teal-500', textColor: 'text-teal-500' };
      case 'dinheiro':
        return { icon: Banknote, label: 'Dinheiro', color: 'bg-green-500', textColor: 'text-green-500' };
      case 'credito':
      case 'crédito':
        return { icon: CreditCard, label: 'Cartão de Crédito', color: 'bg-blue-500', textColor: 'text-blue-500' };
      case 'debito':
      case 'débito':
        return { icon: CreditCard, label: 'Cartão de Débito', color: 'bg-purple-500', textColor: 'text-purple-500' };
      default:
        return { icon: Receipt, label: forma || 'Pagamento', color: 'bg-gray-500', textColor: 'text-gray-500' };
    }
  };

  // Get próximo ponto
  const getProximoPonto = () => {
    if (!pontoHoje || !pontoHoje.entrada_manha) return { tipo: 'entrada_manha', label: 'Entrada' };
    if (!pontoHoje.saida_almoco) return { tipo: 'saida_almoco', label: 'Saída Almoço' };
    if (!pontoHoje.entrada_tarde) return { tipo: 'entrada_tarde', label: 'Retorno' };
    if (!pontoHoje.saida) return { tipo: 'saida', label: 'Saída' };
    return { tipo: 'completo', label: 'Dia Completo' };
  };

  // Calcular horas trabalhadas
  const calcularHorasTrabalhadas = (ponto: PontoRegistro) => {
    if (!ponto.entrada_manha || !ponto.saida) return 0;

    const entrada = new Date(`2000-01-01T${ponto.entrada_manha}`);
    const saida = new Date(`2000-01-01T${ponto.saida}`);

    let totalMinutos = (saida.getTime() - entrada.getTime()) / 1000 / 60;

    if (ponto.saida_almoco && ponto.entrada_tarde) {
      const saidaAlmoco = new Date(`2000-01-01T${ponto.saida_almoco}`);
      const entradaTarde = new Date(`2000-01-01T${ponto.entrada_tarde}`);
      const minutosAlmoco = (entradaTarde.getTime() - saidaAlmoco.getTime()) / 1000 / 60;
      totalMinutos -= minutosAlmoco;
    }

    return Number((totalMinutos / 60).toFixed(2));
  };

  // Handle ponto registration
  const handleRegistrarPonto = async () => {
    if (!selectedProfissional) return;
    
    const proximoPonto = getProximoPonto();
    if (proximoPonto.tipo === 'completo') {
      toast.info('Todos os pontos do dia já foram registrados');
      return;
    }

    setPontoLoading(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const agora = currentTime.toTimeString().slice(0, 5);

      let novoRegistro: PontoRegistro | null = null;

      if (pontoHoje) {
        const updateData: Record<string, unknown> = { [proximoPonto.tipo]: agora };
        
        if (proximoPonto.tipo === 'saida') {
          const newPonto = { ...pontoHoje, saida: agora };
          updateData.horas_trabalhadas = calcularHorasTrabalhadas(newPonto);
        }

        const { data } = await supabase
          .from('ponto_registros')
          .update(updateData)
          .eq('id', pontoHoje.id)
          .select()
          .single();

        novoRegistro = data;
      } else {
        const { data } = await supabase
          .from('ponto_registros')
          .insert({
            pessoa_id: selectedProfissional.id,
            tipo_pessoa: 'profissional',
            data: hoje,
            [proximoPonto.tipo]: agora
          })
          .select()
          .single();

        novoRegistro = data;
      }

      setComprovante({
        nome: selectedProfissional.nome,
        data: format(new Date(), "dd/MM/yyyy"),
        tipo: proximoPonto.label,
        hora: agora,
        registro: novoRegistro
      });

      toast.success(`${proximoPonto.label} registrada às ${agora}!`);
      await loadPontoHoje();
      setShowComprovante(true);
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      toast.error('Erro ao registrar ponto');
    } finally {
      setPontoLoading(false);
    }
  };

  // Imprimir comprovante
  const handleImprimirComprovante = () => {
    if (comprovanteRef.current) {
      const printContent = comprovanteRef.current.innerHTML;
      const printWindow = window.open('', '', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Comprovante de Ponto</title>
              <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .logo { width: 80px; height: 80px; border-radius: 10px; margin-bottom: 10px; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .subtitle { font-size: 12px; color: #666; }
                .divider { border-top: 1px dashed #000; margin: 15px 0; }
                .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
                .label { color: #666; }
                .value { font-weight: bold; }
                .status { text-align: center; padding: 15px; background: #f0f9f0; border-radius: 10px; margin: 15px 0; }
                .status-icon { font-size: 24px; margin-bottom: 5px; }
                .status-text { color: #22c55e; font-weight: bold; }
                .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleFecharComprovante = () => {
    setShowComprovante(false);
    setComprovante(null);
    setSelectedProfissional(null);
    setShowPontoModal(false);
  };

  const proximoPonto = getProximoPonto();

  // Finalized screen - Thank you message
  if (showFinalizado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-8">
        <div className="text-center animate-fade-in">
          <div className="w-32 h-32 mx-auto mb-8 bg-green-500/10 rounded-full flex items-center justify-center animate-scale-in">
            <Check className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Obrigado pela preferência!
          </h1>
          <p className="text-2xl text-muted-foreground">
            Volte sempre!
          </p>
        </div>
      </div>
    );
  }

  // Active comanda view - Shows payment info (NO ponto button here)
  if (comanda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/30 flex flex-col select-none">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <img 
              src={logoMaicon} 
              alt="Maicon Maksuel Concept" 
              className="h-14 w-auto rounded-lg shadow-md"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Maicon Maksuel</h1>
              <p className="text-xs text-muted-foreground">Concept</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary tabular-nums">
              {formatTime(currentTime)}
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 flex gap-6">
          {/* Left Side - Comanda Info */}
          <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-lg border overflow-hidden animate-fade-in">
            {/* Comanda Header */}
            <div className="p-6 bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-primary text-primary-foreground text-lg px-4 py-1.5 mb-2">
                    Comanda #{comanda.numero}
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground">
                    {comanda.cliente}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className="text-base">
                    {comanda.status === 'fechando' ? 'Fechando conta' : comanda.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 p-6 overflow-auto">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                Serviços e Produtos
              </h3>
              <div className="space-y-3">
                {comanda.itens.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-lg">
                        {item.nome}
                      </p>
                      {item.profissional && (
                        <p className="text-sm text-muted-foreground">
                          Profissional: {item.profissional}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-lg">
                        {formatCurrency(item.valorUnitario)}
                      </p>
                      {item.quantidade > 1 && (
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantidade}
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
                  <div className="flex justify-between mb-2 text-green-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(comanda.desconto)}</span>
                  </div>
                  <Separator className="my-3" />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-foreground">
                  TOTAL
                </span>
                <span className="text-4xl font-bold text-primary">
                  {formatCurrency(comanda.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Info Only */}
          <div className="w-80 flex flex-col gap-6">
            {/* Payment Method Card */}
            {comanda?.formaPagamento && (
              <div className="bg-card rounded-2xl shadow-lg border p-6 animate-fade-in">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                  Forma de Pagamento
                </h3>
                {(() => {
                  const paymentInfo = getPaymentInfo(comanda.formaPagamento);
                  const PaymentIcon = paymentInfo.icon;
                  return (
                    <div className={`p-6 rounded-xl ${paymentInfo.color} text-white`}>
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <PaymentIcon className="h-12 w-12" />
                      </div>
                      <p className="text-center text-2xl font-bold">
                        {paymentInfo.label}
                      </p>
                    </div>
                  );
                })()}

                {/* QR Code for PIX */}
                {comanda.formaPagamento?.toLowerCase() === 'pix' && (
                  <div className="mt-6">
                    <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                      <div className="w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                        <QrCode className="h-24 w-24 text-gray-700" />
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      Escaneie para pagar
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods Info */}
            <div className="bg-card rounded-2xl shadow-lg border p-6 flex-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                Formas Aceitas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-teal-500" />
                  </div>
                  <span className="font-medium">PIX</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Cartão Crédito/Débito</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="font-medium">Dinheiro</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // IDLE STATE - Logo with animation and minimalist ponto button
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/20 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo container with floating animation */}
        <div className="relative mb-8">
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl animate-pulse"
            style={{ animationDuration: '3s' }}
          />
          
          {/* Logo with breathing animation */}
          <div 
            className="relative"
            style={{
              animation: 'floating 6s ease-in-out infinite'
            }}
          >
            <img 
              src={logoMaicon} 
              alt="Maicon Maksuel Concept" 
              className="h-48 w-auto rounded-3xl shadow-2xl border-4 border-white/20"
            />
          </div>
        </div>

        {/* Salon name */}
        <h1 
          className="text-4xl font-bold text-foreground mb-2 opacity-0"
          style={{ animation: 'fadeInUp 1s ease-out 0.5s forwards' }}
        >
          Maicon Maksuel
        </h1>
        <p 
          className="text-xl text-muted-foreground mb-12 opacity-0"
          style={{ animation: 'fadeInUp 1s ease-out 0.7s forwards' }}
        >
          Concept
        </p>

        {/* Clock */}
        <div 
          className="text-6xl font-bold text-primary tabular-nums mb-16 opacity-0"
          style={{ 
            animation: 'fadeInUp 1s ease-out 0.9s forwards',
            textShadow: '0 4px 20px rgba(var(--primary), 0.3)'
          }}
        >
          {formatTime(currentTime)}
        </div>

        {/* Minimalist Ponto Button */}
        <button
          onClick={() => setShowPontoModal(true)}
          className="group flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-500 hover:bg-card/50 hover:shadow-xl opacity-0 touch-manipulation active:scale-95"
          style={{ animation: 'fadeInUp 1s ease-out 1.1s forwards' }}
        >
          <div 
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:scale-110"
          >
            <Fingerprint className="h-8 w-8 text-primary transition-colors group-hover:text-primary-foreground" />
          </div>
          <span className="text-sm text-muted-foreground font-medium transition-colors group-hover:text-foreground">
            Registrar Ponto
          </span>
        </button>
      </div>

      {/* Subtle footer */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/50">
          Sistema de Gestão
        </p>
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
      `}</style>

      {/* Ponto Eletrônico Modal */}
      <Dialog open={showPontoModal} onOpenChange={(open) => {
        setShowPontoModal(open);
        if (!open) {
          setSelectedProfissional(null);
          setShowComprovante(false);
          setComprovante(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Fingerprint className="h-6 w-6 text-primary" />
              Ponto Eletrônico
            </DialogTitle>
            <DialogDescription>
              {!selectedProfissional 
                ? "Selecione seu nome para registrar o ponto" 
                : showComprovante 
                  ? "Comprovante de registro" 
                  : "Registre sua entrada ou saída"}
            </DialogDescription>
          </DialogHeader>

          {/* Comprovante View */}
          {showComprovante && comprovante ? (
            <div className="py-4">
              <div ref={comprovanteRef} className="bg-white text-black p-6 rounded-xl border-2 border-dashed">
                <div className="header text-center mb-4">
                  <img src={logoMaicon} alt="Logo" className="logo w-20 h-20 rounded-lg mx-auto mb-3" />
                  <div className="title text-lg font-bold">Maicon Maksuel Concept</div>
                  <div className="subtitle text-sm text-gray-600">Comprovante de Ponto</div>
                </div>
                
                <div className="divider border-t border-dashed border-gray-400 my-4" />
                
                <div className="space-y-3 text-sm">
                  <div className="row flex justify-between">
                    <span className="label text-gray-600">Colaborador:</span>
                    <span className="value font-bold">{comprovante.nome}</span>
                  </div>
                  <div className="row flex justify-between">
                    <span className="label text-gray-600">Data:</span>
                    <span className="value font-bold">{comprovante.data}</span>
                  </div>
                  <div className="row flex justify-between">
                    <span className="label text-gray-600">Tipo:</span>
                    <span className="value font-bold">{comprovante.tipo}</span>
                  </div>
                  <div className="row flex justify-between">
                    <span className="label text-gray-600">Horário:</span>
                    <span className="value font-bold text-lg">{comprovante.hora}</span>
                  </div>
                </div>

                <div className="divider border-t border-dashed border-gray-400 my-4" />

                {comprovante.registro && (
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className={`p-2 rounded text-center ${comprovante.registro.entrada_manha ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <div className="font-bold">{comprovante.registro.entrada_manha || '--:--'}</div>
                      <div>Entrada</div>
                    </div>
                    <div className={`p-2 rounded text-center ${comprovante.registro.saida_almoco ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      <div className="font-bold">{comprovante.registro.saida_almoco || '--:--'}</div>
                      <div>Almoço</div>
                    </div>
                    <div className={`p-2 rounded text-center ${comprovante.registro.entrada_tarde ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      <div className="font-bold">{comprovante.registro.entrada_tarde || '--:--'}</div>
                      <div>Retorno</div>
                    </div>
                    <div className={`p-2 rounded text-center ${comprovante.registro.saida ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                      <div className="font-bold">{comprovante.registro.saida || '--:--'}</div>
                      <div>Saída</div>
                    </div>
                  </div>
                )}

                <div className="divider border-t border-dashed border-gray-400 my-4" />

                <div className="status text-center p-4 bg-green-50 rounded-lg">
                  <div className="status-icon text-2xl mb-1">✅</div>
                  <div className="status-text text-green-600 font-bold">
                    Ponto Registrado com Sucesso!
                  </div>
                </div>

                <div className="footer text-center text-xs text-gray-500 mt-4">
                  Registrado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 h-14 touch-manipulation"
                  onClick={handleImprimirComprovante}
                >
                  <Printer className="h-5 w-5 mr-2" />
                  Imprimir
                </Button>
                <Button
                  className="flex-1 h-14 touch-manipulation"
                  onClick={handleFecharComprovante}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Concluir
                </Button>
              </div>
            </div>
          ) : !selectedProfissional ? (
            <div className="grid gap-2 max-h-80 overflow-auto py-4">
              {profissionais.map((prof) => (
                <Button
                  key={prof.id}
                  variant="outline"
                  className="h-16 justify-start text-lg touch-manipulation active:scale-98"
                  onClick={() => setSelectedProfissional(prof)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    {prof.foto_url ? (
                      <img src={prof.foto_url} alt={prof.nome} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <div>{prof.nome}</div>
                    {prof.especialidade && (
                      <div className="text-xs text-muted-foreground">{prof.especialidade}</div>
                    )}
                  </div>
                  <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </Button>
              ))}
              {profissionais.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum profissional cadastrado
                </p>
              )}
            </div>
          ) : (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {selectedProfissional.foto_url ? (
                    <img src={selectedProfissional.foto_url} alt={selectedProfissional.nome} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-primary" />
                  )}
                </div>
                <h3 className="text-xl font-semibold">{selectedProfissional.nome}</h3>
                <p className="text-3xl font-bold text-primary tabular-nums mt-2">
                  {currentTime.toTimeString().slice(0, 5)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              {pontoHoje && (
                <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
                  <div className={`p-3 rounded-xl text-center ${pontoHoje.entrada_manha ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    <div className="font-semibold">{pontoHoje.entrada_manha || '--:--'}</div>
                    <div className="text-xs">Entrada</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${pontoHoje.saida_almoco ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
                    <div className="font-semibold">{pontoHoje.saida_almoco || '--:--'}</div>
                    <div className="text-xs">Almoço</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${pontoHoje.entrada_tarde ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                    <div className="font-semibold">{pontoHoje.entrada_tarde || '--:--'}</div>
                    <div className="text-xs">Retorno</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${pontoHoje.saida ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                    <div className="font-semibold">{pontoHoje.saida || '--:--'}</div>
                    <div className="text-xs">Saída</div>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className={`w-full h-20 text-xl font-bold touch-manipulation active:scale-95 ${
                  proximoPonto.tipo === 'completo' 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                }`}
                onClick={handleRegistrarPonto}
                disabled={pontoLoading || proximoPonto.tipo === 'completo'}
              >
                {pontoLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : proximoPonto.tipo === 'completo' ? (
                  <>
                    <Check className="h-8 w-8 mr-3" />
                    Dia Completo
                  </>
                ) : (
                  <>
                    <Clock className="h-8 w-8 mr-3" />
                    Registrar {proximoPonto.label}
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full mt-4 touch-manipulation"
                onClick={() => setSelectedProfissional(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
