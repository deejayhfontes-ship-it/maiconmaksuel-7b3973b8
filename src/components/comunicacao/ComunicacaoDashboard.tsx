import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, 
  WifiOff, 
  Send, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Zap,
  TrendingUp,
  Users,
  Calendar
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
  onTestarConexao: () => void;
  onReconectar: () => void;
  testando: boolean;
}

export function ComunicacaoDashboard({ 
  isConnected, 
  estatisticas, 
  creditos,
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

  const taxaResposta = stats.mensagens_enviadas > 0 
    ? Math.round((stats.mensagens_respondidas / stats.mensagens_enviadas) * 100) 
    : 0;

  const taxaEntrega = stats.mensagens_enviadas > 0
    ? Math.round((stats.mensagens_entregues / stats.mensagens_enviadas) * 100)
    : 0;

  const creditosBaixos = creditos && creditos.saldo_creditos < creditos.alerta_creditos_minimo;

  return (
    <div className="space-y-6">
      {/* Status + Alertas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status da Conexão */}
        <Card className={isConnected ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              Status WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-green-500" : ""}>
                {isConnected ? "Online" : "Offline"}
              </Badge>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onTestarConexao}
                  disabled={testando}
                >
                  {testando ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                </Button>
                {!isConnected && (
                  <Button size="sm" onClick={onReconectar} disabled={testando}>
                    Reconectar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens Enviadas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Mensagens Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mensagens_enviadas}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={taxaEntrega} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{taxaEntrega}% entregues</span>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Resposta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Taxa de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaResposta}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.mensagens_respondidas} de {stats.mensagens_enviadas} responderam
            </p>
          </CardContent>
        </Card>

        {/* Confirmações */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Confirmações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-bold text-green-600">{stats.agendamentos_confirmados}</span>
                </div>
                <span className="text-xs text-muted-foreground">confirmados</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-lg font-bold text-destructive">{stats.agendamentos_cancelados}</span>
                </div>
                <span className="text-xs text-muted-foreground">cancelados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <div className="flex flex-wrap gap-3">
        {stats.falhas_envio > 0 && (
          <Badge variant="destructive" className="gap-1 py-1.5 px-3">
            <AlertTriangle className="h-3 w-3" />
            {stats.falhas_envio} falha(s) de envio hoje
          </Badge>
        )}
        {creditosBaixos && (
          <Badge variant="outline" className="gap-1 py-1.5 px-3 border-amber-500 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Créditos baixos: {creditos?.saldo_creditos} restantes
          </Badge>
        )}
        {!isConnected && (
          <Badge variant="outline" className="gap-1 py-1.5 px-3 border-destructive text-destructive">
            <WifiOff className="h-3 w-3" />
            WhatsApp desconectado - mensagens não serão enviadas
          </Badge>
        )}
      </div>

      {/* Créditos */}
      {creditos && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              💳 Saldo de Créditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold">{creditos.saldo_creditos}</span>
                <span className="text-muted-foreground ml-2">créditos</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  ≈ {Math.floor(creditos.saldo_creditos)} mensagens
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {creditos.custo_por_mensagem.toFixed(2)}/msg
                </p>
              </div>
              <Button variant="outline" size="sm">
                Comprar Créditos
              </Button>
            </div>
            {creditosBaixos && (
              <div className="mt-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Créditos abaixo do mínimo ({creditos.alerta_creditos_minimo}). Recarregue para evitar interrupções.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas Detalhadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lidas</p>
                <p className="text-xl font-bold">{stats.mensagens_lidas}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Respondidas</p>
                <p className="text-xl font-bold">{stats.mensagens_respondidas}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas</p>
                <p className="text-xl font-bold text-destructive">{stats.falhas_envio}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
