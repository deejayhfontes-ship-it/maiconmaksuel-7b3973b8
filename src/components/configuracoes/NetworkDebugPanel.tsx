import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNetworkDebug } from "@/contexts/NetworkDebugContext";
import {
  Activity,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function NetworkDebugPanel() {
  const {
    isDebugMode,
    setDebugMode,
    requests,
    endpointStats,
    totalRequests5s,
    totalRequests30s,
    duplicateCount,
    avgTtfb,
    clearRequests,
    exportDiagnostics,
    dashboardLoadTime,
  } = useNetworkDebug();

  const handleExport = () => {
    const data = exportDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Diagnóstico exportado!');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportDiagnostics());
    toast.success('Copiado para a área de transferência!');
  };

  const recentRequests = requests.slice(-20).reverse();
  const errorRequests = requests.filter(r => r.status && (r.status >= 400 || r.status === 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Network Debug Mode
        </h2>
        <p className="text-muted-foreground text-sm">
          Monitore requisições, identifique duplicações e analise performance
        </p>
      </div>

      {/* Toggle Debug Mode */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Modo Debug de Rede</p>
              <p className="text-xs text-muted-foreground">
                Intercepta e analisa todas as requisições ao backend
              </p>
            </div>
          </div>
          <Switch
            checked={isDebugMode}
            onCheckedChange={setDebugMode}
          />
        </div>
      </Card>

      {isDebugMode && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalRequests5s}</p>
              <p className="text-xs text-muted-foreground">Últimos 5s</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalRequests30s}</p>
              <p className="text-xs text-muted-foreground">Últimos 30s</p>
            </Card>
            <Card className={`p-4 text-center ${duplicateCount > 0 ? 'border-warning' : ''}`}>
              <p className={`text-2xl font-bold ${duplicateCount > 0 ? 'text-warning' : 'text-success'}`}>
                {duplicateCount}
              </p>
              <p className="text-xs text-muted-foreground">Duplicadas</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{Math.round(avgTtfb)}ms</p>
              <p className="text-xs text-muted-foreground">TTFB Médio</p>
            </Card>
          </div>

          {/* Dashboard Load Time */}
          {dashboardLoadTime && (
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Tempo de carregamento do Dashboard:{" "}
                  <strong>{Math.round(dashboardLoadTime)}ms</strong>
                </span>
              </div>
            </Card>
          )}

          {/* Errors */}
          {errorRequests.length > 0 && (
            <Card className="p-4 border-destructive">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">
                  Erros Detectados ({errorRequests.length})
                </h3>
              </div>
              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {errorRequests.slice(-10).map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-sm p-2 bg-destructive/10 rounded">
                      <Badge variant="destructive" className="shrink-0">
                        {req.status || 'ERR'}
                      </Badge>
                      <span className="font-mono text-xs truncate flex-1">
                        {req.endpoint}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {req.ttfb ? `${Math.round(req.ttfb)}ms` : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Endpoint Stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Estatísticas por Endpoint
            </h3>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {Array.from(endpointStats.entries())
                  .sort((a, b) => b[1].calls30s - a[1].calls30s)
                  .slice(0, 15)
                  .map(([key, stats]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs truncate">{stats.endpoint}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{stats.calls5s}×/5s</Badge>
                        <Badge variant="outline">{stats.calls30s}×/30s</Badge>
                        {stats.duplicates > 0 && (
                          <Badge variant="destructive">{stats.duplicates} dup</Badge>
                        )}
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {Math.round(stats.avgTtfb)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                {endpointStats.size === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Nenhuma requisição capturada ainda
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Recent Requests */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Requisições Recentes
            </h3>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {recentRequests.map(req => (
                  <div 
                    key={req.id} 
                    className={`flex items-center gap-2 p-2 rounded text-xs ${
                      req.isDuplicate 
                        ? 'bg-warning/10 border border-warning/30' 
                        : req.status && req.status >= 400 
                          ? 'bg-destructive/10' 
                          : 'bg-muted/30'
                    }`}
                  >
                    {req.status && req.status < 400 ? (
                      <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                    )}
                    <Badge 
                      variant={req.status && req.status < 400 ? "outline" : "destructive"}
                      className="shrink-0"
                    >
                      {req.status || '...'}
                    </Badge>
                    <span className="font-mono truncate flex-1">
                      {req.endpoint}
                    </span>
                    {req.isDuplicate && (
                      <Badge variant="warning" className="shrink-0">DUP</Badge>
                    )}
                    <span className="text-muted-foreground shrink-0">
                      {req.ttfb ? `${Math.round(req.ttfb)}ms` : '...'}
                    </span>
                  </div>
                ))}
                {recentRequests.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Navegue pelo app para ver as requisições
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearRequests}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button variant="outline" onClick={handleCopyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar JSON
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Diagnóstico
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
