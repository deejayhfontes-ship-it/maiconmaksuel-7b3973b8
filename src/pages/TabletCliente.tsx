import { useState, useEffect } from "react";
import { QrCode, CreditCard, DollarSign, Clock, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Simulated data - in production this would come from realtime subscription
interface ComandaItem {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  profissional?: string;
}

interface ComandaData {
  numero: number;
  cliente: string;
  status: "aguardando" | "em_atendimento" | "fechando" | "finalizado";
  itens: ComandaItem[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento?: string;
  pixChave?: string;
  pixQrCode?: string;
}

export default function TabletCliente() {
  const [config, setConfig] = useState({
    mostrarLogoTela: true,
    mostrarValorTotal: true,
    mostrarItens: true,
    mostrarFormaPagamento: true,
    mostrarQrCodePix: true,
    corFundoTela: "#1a1a2e",
    corTextoTela: "#ffffff",
    corDestaqueTela: "#e94560",
    mensagemBoasVindas: "Bem-vindo(a)!",
    mensagemAguardando: "Aguardando atendimento...",
    mensagemFinalizada: "Obrigado pela preferência!",
    tempoExibicaoFinalizada: "5",
    pixChave: "",
    pixNomeRecebedor: "Salão Beauty Pro",
    pixCidade: "São Paulo",
  });

  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const [showFinalizado, setShowFinalizado] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tablet_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Erro ao carregar configurações');
      }
    }

    // Simulate receiving comanda data (in production, use Supabase realtime)
    // For demo, show example data after 2 seconds
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
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Handle finalized state
  useEffect(() => {
    if (comanda?.status === "finalizado") {
      setShowFinalizado(true);
      const timeout = setTimeout(() => {
        setShowFinalizado(false);
        setComanda(null);
      }, parseInt(config.tempoExibicaoFinalizada) * 1000);
      return () => clearTimeout(timeout);
    }
  }, [comanda?.status, config.tempoExibicaoFinalizada]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Render based on state
  const renderContent = () => {
    // Finalizado state
    if (showFinalizado) {
      return (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
          <div 
            className="p-6 rounded-full mb-6"
            style={{ backgroundColor: config.corDestaqueTela + '20' }}
          >
            <Check 
              className="h-24 w-24" 
              style={{ color: config.corDestaqueTela }}
            />
          </div>
          <h1 
            className="text-4xl font-bold mb-4 text-center"
            style={{ color: config.corTextoTela }}
          >
            {config.mensagemFinalizada}
          </h1>
          {comanda && (
            <p 
              className="text-xl opacity-80"
              style={{ color: config.corTextoTela }}
            >
              Comanda #{comanda.numero} - {comanda.cliente}
            </p>
          )}
        </div>
      );
    }

    // Waiting state
    if (!comanda) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          {config.mostrarLogoTela && (
            <div className="mb-8">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: config.corDestaqueTela, color: config.corTextoTela }}
              >
                BP
              </div>
            </div>
          )}
          <h1 
            className="text-4xl font-bold mb-4"
            style={{ color: config.corTextoTela }}
          >
            {config.mensagemBoasVindas}
          </h1>
          <p 
            className="text-xl opacity-70 flex items-center gap-3"
            style={{ color: config.corTextoTela }}
          >
            <Loader2 className="h-6 w-6 animate-spin" />
            {config.mensagemAguardando}
          </p>
        </div>
      );
    }

    // Active comanda
    return (
      <div className="flex flex-col h-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Badge 
              className="text-lg px-4 py-1"
              style={{ backgroundColor: config.corDestaqueTela, color: config.corTextoTela }}
            >
              Comanda #{comanda.numero}
            </Badge>
            <h2 
              className="text-2xl font-semibold mt-2"
              style={{ color: config.corTextoTela }}
            >
              {comanda.cliente}
            </h2>
          </div>
          {config.mostrarLogoTela && (
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: config.corDestaqueTela, color: config.corTextoTela }}
            >
              BP
            </div>
          )}
        </div>

        {/* Items */}
        {config.mostrarItens && comanda.itens.length > 0 && (
          <div className="flex-1 overflow-auto mb-6">
            <h3 
              className="text-lg font-medium mb-4 opacity-70"
              style={{ color: config.corTextoTela }}
            >
              Itens do Atendimento
            </h3>
            <div className="space-y-3">
              {comanda.itens.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: config.corTextoTela + '10' }}
                >
                  <div>
                    <p 
                      className="font-medium"
                      style={{ color: config.corTextoTela }}
                    >
                      {item.nome}
                    </p>
                    {item.profissional && (
                      <p 
                        className="text-sm opacity-60"
                        style={{ color: config.corTextoTela }}
                      >
                        Profissional: {item.profissional}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p 
                      className="font-semibold"
                      style={{ color: config.corTextoTela }}
                    >
                      {formatCurrency(item.valorUnitario)}
                    </p>
                    {item.quantidade > 1 && (
                      <p 
                        className="text-sm opacity-60"
                        style={{ color: config.corTextoTela }}
                      >
                        Qtd: {item.quantidade}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Section */}
        {config.mostrarValorTotal && (
          <div 
            className="p-6 rounded-xl"
            style={{ backgroundColor: config.corTextoTela + '10' }}
          >
            {comanda.desconto > 0 && (
              <div className="flex justify-between mb-2">
                <span style={{ color: config.corTextoTela }} className="opacity-70">Subtotal</span>
                <span style={{ color: config.corTextoTela }}>{formatCurrency(comanda.subtotal)}</span>
              </div>
            )}
            {comanda.desconto > 0 && (
              <div className="flex justify-between mb-2">
                <span style={{ color: config.corTextoTela }} className="opacity-70">Desconto</span>
                <span style={{ color: '#22c55e' }}>-{formatCurrency(comanda.desconto)}</span>
              </div>
            )}
            <Separator className="my-3" style={{ backgroundColor: config.corTextoTela + '20' }} />
            <div className="flex justify-between items-center">
              <span 
                className="text-2xl font-bold"
                style={{ color: config.corTextoTela }}
              >
                TOTAL
              </span>
              <span 
                className="text-4xl font-bold"
                style={{ color: config.corDestaqueTela }}
              >
                {formatCurrency(comanda.total)}
              </span>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {config.mostrarFormaPagamento && comanda.formaPagamento && (
          <div className="mt-6">
            <div 
              className="flex items-center justify-center gap-3 p-4 rounded-xl"
              style={{ backgroundColor: config.corDestaqueTela + '20' }}
            >
              {comanda.formaPagamento === "PIX" ? (
                <QrCode className="h-8 w-8" style={{ color: config.corDestaqueTela }} />
              ) : comanda.formaPagamento === "Dinheiro" ? (
                <DollarSign className="h-8 w-8" style={{ color: config.corDestaqueTela }} />
              ) : (
                <CreditCard className="h-8 w-8" style={{ color: config.corDestaqueTela }} />
              )}
              <span 
                className="text-2xl font-semibold"
                style={{ color: config.corTextoTela }}
              >
                Pagamento via {comanda.formaPagamento}
              </span>
            </div>

            {/* PIX QR Code */}
            {config.mostrarQrCodePix && comanda.formaPagamento === "PIX" && (
              <div className="mt-6 flex flex-col items-center">
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  {/* Placeholder QR Code - in production use a QR library */}
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                    <QrCode className="h-32 w-32 text-gray-800" />
                  </div>
                </div>
                <p 
                  className="mt-4 text-center opacity-70"
                  style={{ color: config.corTextoTela }}
                >
                  Escaneie o QR Code para pagar
                </p>
                {config.pixChave && (
                  <p 
                    className="mt-2 text-sm opacity-50"
                    style={{ color: config.corTextoTela }}
                  >
                    Chave PIX: {config.pixChave}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: config.corFundoTela }}
    >
      {renderContent()}

      {/* Footer timestamp */}
      <div 
        className="fixed bottom-4 right-4 flex items-center gap-2 opacity-50"
        style={{ color: config.corTextoTela }}
      >
        <Clock className="h-4 w-4" />
        <span className="text-sm">
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
