import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  Send, 
  Calendar,
  Zap,
  RefreshCw,
  CreditCard
} from "lucide-react";

interface Props {
  isConnected: boolean;
  estatisticas: {
    mensagens_enviadas: number;
    mensagens_entregues: number;
    mensagens_lidas: number;
    mensagens_respondidas: number;
    agendamentos_confirmados: number;
    agendamentos_cancelados: number;
    falhas_envio: number;
  } | null;
  creditos: {
    saldo_creditos: number;
    alerta_creditos_minimo: number;
    custo_por_mensagem: number;
  } | null;
  proximosEnvios?: number;
  onTestarConexao: () => void;
  onReconectar: () => void;
  testando: boolean;
}

export function ComunicacaoDashboardCompacto({ 
  isConnected, 
  estatisticas, 
  creditos,
  proximosEnvios = 0,
  onTestarConexao, 
  onReconectar,
  testando 
}: Props) {
  const stats = estatisticas || {
    mensagens_enviadas: 0,
    mensagens_entregues: 0,
    mensagens_lidas: 0,
    mensagens_respondidas: 0,
    agendamentos_confirmados: 0,
    agendamentos_cancelados: 0,
    falhas_envio: 0
  };

  const creditosBaixos = creditos && creditos.saldo_creditos < creditos.alerta_creditos_minimo;
  
  // Estimar dias restantes de créditos (baseado em média diária)
  const diasRestantes = creditos && stats.mensagens_enviadas > 0
    ? Math.floor(creditos.saldo_creditos / Math.max(stats.mensagens_enviadas, 30))
    : creditos ? Math.floor(creditos.saldo_creditos / 30) : 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Título + Status */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📊 Dashboard WhatsApp
          </h2>
          <Badge 
            variant={isConnected ? "default" : "destructive"} 
            className={`gap-1.5 ${isConnected ? "bg-success text-success-foreground" : ""}`}
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <span className="font-medium">{stats.mensagens_enviadas}</span>
            <span className="text-muted-foreground">msgs hoje</span>
          </div>
          
          {proximosEnvios > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              <span className="font-medium">{proximosEnvios}</span>
              <span className="text-muted-foreground">lembretes (1h)</span>
            </div>
          )}
          
          {creditos && (
          <div className="flex items-center gap-2">
            <CreditCard className={`h-4 w-4 ${creditosBaixos ? "text-destructive" : "text-primary"}`} />
            <span className={`font-medium ${creditosBaixos ? "text-destructive" : ""}`}>
              {creditos.saldo_creditos}
            </span>
            <span className="text-muted-foreground">
              (≈ {diasRestantes} dias)
            </span>
          </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onTestarConexao}
            disabled={testando}
            className="gap-1.5"
          >
            {testando ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Testar
          </Button>
          {!isConnected && (
            <Button 
              size="sm" 
              onClick={onReconectar} 
              disabled={testando}
            >
              Reconectar
            </Button>
          )}
        </div>
      </div>

      {/* Alertas (se houver) */}
      {(stats.falhas_envio > 0 || creditosBaixos || !isConnected) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          {stats.falhas_envio > 0 && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ {stats.falhas_envio} falha(s) de envio
            </Badge>
          )}
          {creditosBaixos && (
            <Badge variant="outline" className="text-xs border-warning text-warning">
              ⚠️ Créditos baixos
            </Badge>
          )}
          {!isConnected && (
            <Badge variant="outline" className="text-xs border-destructive text-destructive">
              ⚠️ Reconecte o WhatsApp
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
