import { useState, useEffect } from "react";
import { QrCode, CreditCard, DollarSign, Clock, Check, Loader2, Fingerprint, Banknote, Smartphone, Receipt, ChevronRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
}

export default function TabletCliente() {
  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const [showFinalizado, setShowFinalizado] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPontoModal, setShowPontoModal] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [pontoLoading, setPontoLoading] = useState(false);

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
        .select('id, nome, foto_url')
        .eq('ativo', true)
        .order('nome');
      
      if (data) {
        setProfissionais(data);
      }
    };
    loadProfissionais();
  }, []);

  // Simulate comanda data (in production, use Supabase realtime)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setComanda({
        numero: 42,
        cliente: "Maria Silva",
        status: "fechando",
        itens: [
          { id: "1", nome: "Corte Feminino", quantidade: 1, valorUnitario: 85.00, profissional: "Ana" },
          { id: "2", nome: "Escova Progressiva", quantidade: 1, valorUnitario: 250.00, profissional: "Ana" },
          { id: "3", nome: "Hidratação Capilar", quantidade: 1, valorUnitario: 65.00, profissional: "Ana" },
        ],
        subtotal: 400.00,
        desconto: 0,
        total: 400.00,
        formaPagamento: "PIX",
      });
    }, 3000);
    return () => clearTimeout(timeout);
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
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

  // Handle ponto registration
  const handleRegistrarPonto = async (tipo: 'entrada' | 'saida') => {
    if (!selectedProfissional) return;
    
    setPontoLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Check if there's already a record for today
      const { data: existingPonto } = await supabase
        .from('ponto_registros')
        .select('*')
        .eq('pessoa_id', selectedProfissional.id)
        .eq('data', hoje)
        .single();

      if (existingPonto) {
        // Update existing record
        const updateData = tipo === 'entrada' 
          ? { entrada_manha: agora }
          : { saida: agora };
        
        await supabase
          .from('ponto_registros')
          .update(updateData)
          .eq('id', existingPonto.id);
      } else {
        // Create new record
        await supabase
          .from('ponto_registros')
          .insert({
            pessoa_id: selectedProfissional.id,
            tipo_pessoa: 'profissional',
            data: hoje,
            entrada_manha: tipo === 'entrada' ? agora : null,
          });
      }

      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada para ${selectedProfissional.nome}!`);
      setShowPontoModal(false);
      setSelectedProfissional(null);
    } catch (error) {
      toast.error('Erro ao registrar ponto');
    } finally {
      setPontoLoading(false);
    }
  };

  // Finalized screen
  if (showFinalizado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-8">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-32 h-32 mx-auto mb-8 bg-green-500/10 rounded-full flex items-center justify-center">
            <Check className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Obrigado pela preferência!
          </h1>
          <p className="text-2xl text-muted-foreground">
            Volte sempre!
          </p>
          {comanda && (
            <p className="text-lg text-muted-foreground mt-4">
              Comanda #{comanda.numero} - {comanda.cliente}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/30 flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img 
            src={logoMaicon} 
            alt="Maicon Maksuel Concept" 
            className="h-16 w-auto rounded-lg shadow-md"
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Maicon Maksuel</h1>
            <p className="text-sm text-muted-foreground">Concept</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary tabular-nums">
            {formatTime(currentTime)}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDate(currentTime)}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex gap-6">
        {/* Left Side - Comanda Info */}
        <div className="flex-1 flex flex-col">
          {!comanda ? (
            // Waiting state
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-8">
                <img 
                  src={logoMaicon} 
                  alt="Logo" 
                  className="h-40 w-auto rounded-2xl shadow-xl"
                />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Bem-vindo(a)!
              </h2>
              <p className="text-xl text-muted-foreground flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Aguardando atendimento...
              </p>
            </div>
          ) : (
            // Active comanda
            <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-lg border overflow-hidden">
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
          )}
        </div>

        {/* Right Side - Payment & Actions */}
        <div className="w-80 flex flex-col gap-6">
          {/* Payment Method Card */}
          {comanda?.formaPagamento && (
            <div className="bg-card rounded-2xl shadow-lg border p-6">
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

          {/* Ponto Eletrônico Button - Only touchable element */}
          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300 touch-manipulation active:scale-95"
            onClick={() => setShowPontoModal(true)}
          >
            <Fingerprint className="h-8 w-8 mr-3" />
            Registrar Ponto
          </Button>

          {/* Info Card */}
          <div className="bg-card rounded-2xl shadow-lg border p-6 flex-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Formas de Pagamento Aceitas
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
                <span className="font-medium">Cartão de Crédito</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                </div>
                <span className="font-medium">Cartão de Débito</span>
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

      {/* Footer */}
      <footer className="p-4 border-t bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Maicon Maksuel Concept • Sistema de Gestão
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Atualizado em tempo real
          </div>
        </div>
      </footer>

      {/* Ponto Eletrônico Modal */}
      <Dialog open={showPontoModal} onOpenChange={setShowPontoModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Fingerprint className="h-6 w-6 text-primary" />
              Registrar Ponto
            </DialogTitle>
            <DialogDescription>
              Selecione seu nome para registrar entrada ou saída
            </DialogDescription>
          </DialogHeader>

          {!selectedProfissional ? (
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
                  {prof.nome}
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
                <p className="text-muted-foreground">{formatTime(currentTime)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="h-20 text-lg bg-green-500 hover:bg-green-600 touch-manipulation active:scale-95"
                  onClick={() => handleRegistrarPonto('entrada')}
                  disabled={pontoLoading}
                >
                  {pontoLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Clock className="h-6 w-6 mr-2" />
                      Entrada
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="h-20 text-lg bg-red-500 hover:bg-red-600 touch-manipulation active:scale-95"
                  onClick={() => handleRegistrarPonto('saida')}
                  disabled={pontoLoading}
                >
                  {pontoLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Clock className="h-6 w-6 mr-2" />
                      Saída
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setSelectedProfissional(null)}
              >
                Voltar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
