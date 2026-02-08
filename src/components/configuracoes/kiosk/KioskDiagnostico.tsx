/**
 * Kiosk Diagnostic Panel
 * Comprehensive diagnostics for Kiosk mode operation
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { ROUTE_PERMISSIONS } from "@/contexts/PinAuthContext";
import { cn } from "@/lib/utils";
import {
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Play,
  Clock,
  Activity,
  Route,
  Terminal,
  Zap,
  Eye,
  Receipt,
  Heart,
  Loader2,
} from "lucide-react";

type LogEntry = {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
};

type RouteCheckResult = {
  path: string;
  status: "ok" | "error" | "warning";
  message: string;
};

type KioskStats = {
  lastUpdate: string | null;
  updateMode: "realtime" | "polling" | "none";
  connectionStatus: "online" | "offline" | "checking";
  lastComandaId: string | null;
  lastComandaStatus: string | null;
  requestCount: number;
  avgResponseTime: number;
};

export default function KioskDiagnostico() {
  const { settings } = useKioskSettings();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [routeChecks, setRouteChecks] = useState<RouteCheckResult[]>([]);
  const [stats, setStats] = useState<KioskStats>({
    lastUpdate: null,
    updateMode: "realtime",
    connectionStatus: "checking",
    lastComandaId: null,
    lastComandaStatus: null,
    requestCount: 0,
    avgResponseTime: 0,
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationState, setSimulationState] = useState<"idle" | "comanda" | "thankyou">("idle");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const requestTimesRef = useRef<number[]>([]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev.slice(-19), { time, message, type }]);
  };

  // Scroll to bottom when logs update
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Initial checks
  useEffect(() => {
    addLog("Diagnóstico do Kiosk iniciado", "info");
    checkConnection();
    checkRoutes();
  }, []);

  // Check connection
  const checkConnection = async () => {
    setStats(prev => ({ ...prev, connectionStatus: "checking" }));
    const startTime = Date.now();
    
    try {
      const { error } = await supabase
        .from("configuracoes_kiosk")
        .select("id")
        .limit(1)
        .single();

      const responseTime = Date.now() - startTime;
      requestTimesRef.current = [...requestTimesRef.current.slice(-9), responseTime];
      const avgTime = requestTimesRef.current.reduce((a, b) => a + b, 0) / requestTimesRef.current.length;

      if (error && error.code !== "PGRST116") throw error;

      setStats(prev => ({
        ...prev,
        connectionStatus: "online",
        lastUpdate: new Date().toISOString(),
        avgResponseTime: Math.round(avgTime),
        requestCount: prev.requestCount + 1,
      }));
      addLog(`Conexão OK (${responseTime}ms)`, "success");
    } catch (error: any) {
      setStats(prev => ({ ...prev, connectionStatus: "offline" }));
      addLog(`Erro de conexão: ${error.message}`, "error");
    }
  };

  // Check routes
  const checkRoutes = () => {
    const kioskRoutes = ROUTE_PERMISSIONS.kiosk;
    const results: RouteCheckResult[] = [];

    // Routes that SHOULD exist for kiosk
    const expectedRoutes = ["/kiosk", "/kiosk/ponto"];
    
    // Routes that should NOT be accessible (caixa completo)
    const forbiddenRoutes = ["/caixa/fechar", "/caixa/gaveta", "/caixa/historico", "/financeiro", "/usuarios"];

    expectedRoutes.forEach(route => {
      const hasAccess = kioskRoutes.includes(route) || kioskRoutes.some(r => route.startsWith(r + "/"));
      results.push({
        path: route,
        status: hasAccess ? "ok" : "error",
        message: hasAccess ? "Rota disponível" : "Rota não mapeada em ROUTE_PERMISSIONS",
      });
    });

    forbiddenRoutes.forEach(route => {
      const hasAccess = kioskRoutes.includes(route) || kioskRoutes.some(r => route.startsWith(r + "/"));
      results.push({
        path: route,
        status: hasAccess ? "warning" : "ok",
        message: hasAccess ? "⚠️ Kiosk não deveria ter acesso" : "Corretamente bloqueado",
      });
    });

    setRouteChecks(results);
    
    const errors = results.filter(r => r.status === "error");
    const warnings = results.filter(r => r.status === "warning");
    
    if (errors.length > 0) {
      addLog(`${errors.length} rota(s) com problema encontrada(s)`, "error");
    } else if (warnings.length > 0) {
      addLog(`${warnings.length} aviso(s) de segurança`, "warning");
    } else {
      addLog("Todas as rotas do Kiosk verificadas OK", "success");
    }
  };

  // Simulate comanda closed event
  const simulateComandaFechada = () => {
    setIsSimulating(true);
    setSimulationState("comanda");
    addLog("Simulando evento: comanda-fechada", "info");

    const fakeComanda = {
      numero: 999,
      cliente: "Cliente Simulado",
      itens: [
        { id: "1", nome: "Corte Masculino", quantidade: 1, valorUnitario: 50, profissional: "João" },
        { id: "2", nome: "Barba", quantidade: 1, valorUnitario: 30, profissional: "João" },
      ],
      subtotal: 80,
      desconto: 0,
      total: 80,
      formaPagamento: "pix",
    };

    // Send broadcast
    const channel = supabase.channel("kiosk-comanda");
    channel.send({
      type: "broadcast",
      event: "comanda-fechada",
      payload: fakeComanda,
    }).then(() => {
      addLog("Evento comanda-fechada enviado com sucesso", "success");
      setStats(prev => ({
        ...prev,
        lastComandaId: "sim-999",
        lastComandaStatus: "fechada",
      }));
    });

    supabase.removeChannel(channel);
  };

  // Simulate payment confirmed event
  const simulatePagamentoConfirmado = () => {
    setSimulationState("thankyou");
    addLog("Simulando evento: pagamento-confirmado", "info");

    const channel = supabase.channel("kiosk-comanda");
    channel.send({
      type: "broadcast",
      event: "pagamento-confirmado",
      payload: {},
    }).then(() => {
      addLog("Evento pagamento-confirmado enviado com sucesso", "success");
      setStats(prev => ({
        ...prev,
        lastComandaStatus: "pago",
      }));
      
      // Reset after animation
      setTimeout(() => {
        setSimulationState("idle");
        setIsSimulating(false);
        addLog("Simulação concluída - retorno ao idle", "info");
      }, 6000);
    });

    supabase.removeChannel(channel);
  };

  // Test responsiveness
  const testResponsiveness = (size: string) => {
    addLog(`Abrindo preview em ${size}`, "info");
    const sizes: Record<string, { w: number; h: number }> = {
      "1366x768": { w: 1366, h: 768 },
      "1920x1080": { w: 1920, h: 1080 },
      "1080x1920": { w: 1080, h: 1920 },
    };
    const s = sizes[size];
    if (s) {
      window.open(`/kiosk`, "_blank", `width=${s.w},height=${s.h}`);
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error": return <XCircle className="h-3 w-3 text-red-500" />;
      case "warning": return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      default: return <Activity className="h-3 w-3 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          Diagnóstico do Kiosk
        </h2>
        <p className="text-muted-foreground text-sm">
          Verifique status, rotas, responsividade e simule eventos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conectividade</span>
              <div className="flex items-center gap-2">
                {stats.connectionStatus === "checking" && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando
                  </Badge>
                )}
                {stats.connectionStatus === "online" && (
                  <Badge className="gap-1 bg-green-500">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                )}
                {stats.connectionStatus === "offline" && (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modo de Atualização</span>
              <Badge variant="outline">{stats.updateMode === "realtime" ? "Realtime" : "Polling"}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última Atualização</span>
              <span className="text-sm font-mono">
                {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString("pt-BR") : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tempo Médio Resposta</span>
              <span className="text-sm font-mono">{stats.avgResponseTime}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Requests Realizados</span>
              <span className="text-sm font-mono">{stats.requestCount}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última Comanda</span>
              <span className="text-sm font-mono">{stats.lastComandaId || "-"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status Comanda</span>
              <Badge variant="outline">{stats.lastComandaStatus || "-"}</Badge>
            </div>

            <Button onClick={checkConnection} className="w-full" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Conexão
            </Button>
          </CardContent>
        </Card>

        {/* Route Health Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Verificação de Rotas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {routeChecks.map((check, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-sm",
                      check.status === "ok" && "bg-green-50 dark:bg-green-950/20",
                      check.status === "error" && "bg-red-50 dark:bg-red-950/20",
                      check.status === "warning" && "bg-yellow-50 dark:bg-yellow-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {check.status === "ok" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {check.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                      {check.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      <code className="font-mono text-xs">{check.path}</code>
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{check.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={checkRoutes} className="w-full mt-3" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Rotas
            </Button>
          </CardContent>
        </Card>

        {/* Responsiveness Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tablet className="h-4 w-4" />
              Teste de Responsividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Abra o Kiosk em diferentes resoluções para verificar o layout
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => testResponsiveness("1366x768")}>
                <Monitor className="h-4 w-4 mr-1" />
                1366x768
              </Button>
              <Button variant="outline" size="sm" onClick={() => testResponsiveness("1920x1080")}>
                <Monitor className="h-4 w-4 mr-1" />
                1920x1080
              </Button>
              <Button variant="outline" size="sm" onClick={() => testResponsiveness("1080x1920")}>
                <Smartphone className="h-4 w-4 mr-1" />
                1080x1920
              </Button>
            </div>
            <Button className="w-full" onClick={() => window.open("/kiosk", "_blank")}>
              <Eye className="h-4 w-4 mr-2" />
              Abrir Kiosk em Nova Aba
            </Button>
          </CardContent>
        </Card>

        {/* Simulation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Simulação (Dev Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Simule eventos sem usar o caixa real. Abra o Kiosk em outra aba para ver o resultado.
            </p>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Estado Atual:</span>
              <Badge variant={simulationState === "idle" ? "outline" : "default"}>
                {simulationState === "idle" && "Idle (Espera)"}
                {simulationState === "comanda" && "Resumo da Comanda"}
                {simulationState === "thankyou" && "Obrigado"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={simulateComandaFechada}
                disabled={isSimulating && simulationState !== "idle"}
              >
                <Receipt className="h-4 w-4 mr-1" />
                Simular Comanda
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={simulatePagamentoConfirmado}
                disabled={simulationState !== "comanda"}
              >
                <Heart className="h-4 w-4 mr-1" />
                Simular Pagamento
              </Button>
            </div>

            {isSimulating && (
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-primary">
                  Simulação em andamento... Verifique o Kiosk
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Console Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Console de Logs do Kiosk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] bg-muted/50 rounded-lg p-3">
            <div className="font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Nenhum log registrado...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                    {getLogIcon(log.type)}
                    <span className={cn(
                      log.type === "success" && "text-green-600 dark:text-green-400",
                      log.type === "error" && "text-red-600 dark:text-red-400",
                      log.type === "warning" && "text-yellow-600 dark:text-yellow-400",
                      log.type === "info" && "text-foreground"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            (Últimos 20 logs)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
