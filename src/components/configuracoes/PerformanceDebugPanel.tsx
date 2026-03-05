/**
 * Performance Debug Panel
 * Shows real-time performance metrics when ?debugPerf=1 is active
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Clock, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { isDebugPerfActive, getCurrentRequestLog, clearRequestLog } from "@/hooks/usePerformanceDebug";

interface EndpointCount {
  endpoint: string;
  method: string;
  count: number;
  duplicates: number;
  avgTime: number;
}

export function PerformanceDebugPanel() {
  const [isActive] = useState(isDebugPerfActive);
  const [stats, setStats] = useState<{
    total: number;
    get: number;
    head: number;
    patch: number;
    endpoints: EndpointCount[];
    duplicates: number;
  }>({
    total: 0,
    get: 0,
    head: 0,
    patch: 0,
    endpoints: [],
    duplicates: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const refreshStats = () => {
    const log = getCurrentRequestLog();
    const now = Date.now();
    const cutoff = now - 30000;
    
    const recent = log.filter(r => r.timestamp >= cutoff);
    
    // Group by endpoint
    const endpointMap = new Map<string, { 
      count: number; 
      method: string; 
      times: number[];
      params: Set<string>;
    }>();
    
    recent.forEach(req => {
      const key = `${req.method}:${req.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, { 
          count: 0, 
          method: req.method, 
          times: [],
          params: new Set()
        });
      }
      const entry = endpointMap.get(key)!;
      entry.count++;
      entry.times.push(req.duration);
      entry.params.add(req.params);
    });
    
    // Calculate duplicates
    let totalDuplicates = 0;
    const paramCounts = new Map<string, number>();
    recent.forEach(req => {
      const key = `${req.method}:${req.endpoint}:${req.params}`;
      paramCounts.set(key, (paramCounts.get(key) || 0) + 1);
    });
    paramCounts.forEach((count) => {
      if (count > 1) totalDuplicates += count - 1;
    });
    
    const endpoints: EndpointCount[] = Array.from(endpointMap.entries())
      .map(([key, val]) => ({
        endpoint: key.split(":")[1],
        method: val.method,
        count: val.count,
        duplicates: val.count - val.params.size,
        avgTime: val.times.reduce((a, b) => a + b, 0) / val.times.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    setStats({
      total: recent.length,
      get: recent.filter(r => r.method === "GET").length,
      head: recent.filter(r => r.method === "HEAD").length,
      patch: recent.filter(r => r.method === "PATCH").length,
      endpoints,
      duplicates: totalDuplicates,
    });
    setLastUpdate(new Date());
  };

  useEffect(() => {
    if (!isActive) return;
    refreshStats();
    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleExport = () => {
    const log = getCurrentRequestLog();
    const data = {
      timestamp: new Date().toISOString(),
      stats,
      rawLog: log.slice(-100),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perf-debug-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearRequestLog();
    refreshStats();
  };

  if (!isActive) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Debug de performance desativado.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione <code className="bg-muted px-1 rounded">?debugPerf=1</code> na URL para ativar.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Meta validation
  const isLoadTimeMet = true; // Will be set by Dashboard
  const isRequestsMet = stats.total <= 8;
  const isDuplicatesMet = stats.duplicates === 0;
  const isHeadMet = stats.head <= 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Performance Debug</CardTitle>
            <Badge variant="success" className="ml-2">ATIVO</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshStats}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              Limpar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Última atualização: {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Requests (30s)</p>
            {isRequestsMet ? (
              <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive mx-auto mt-1" />
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.duplicates}</p>
            <p className="text-xs text-muted-foreground">Duplicados</p>
            {isDuplicatesMet ? (
              <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive mx-auto mt-1" />
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.head}</p>
            <p className="text-xs text-muted-foreground">HEAD</p>
            {isHeadMet ? (
              <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive mx-auto mt-1" />
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.get}</p>
            <p className="text-xs text-muted-foreground">GET</p>
          </div>
        </div>

        {/* Metas */}
        <div className="border rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Checklist de Metas</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {isRequestsMet ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span>Requests em 30s ≤ 8</span>
              <span className="text-muted-foreground">({stats.total})</span>
            </div>
            <div className="flex items-center gap-2">
              {isDuplicatesMet ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span>Sem duplicatas</span>
              <span className="text-muted-foreground">({stats.duplicates})</span>
            </div>
            <div className="flex items-center gap-2">
              {isHeadMet ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span>HEAD ≤ 2</span>
              <span className="text-muted-foreground">({stats.head})</span>
            </div>
          </div>
        </div>

        {/* Top Endpoints */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Endpoints (30s)</h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {stats.endpoints.map((ep, i) => (
                <div 
                  key={`${ep.method}-${ep.endpoint}-${i}`}
                  className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={ep.method === "GET" ? "secondary" : ep.method === "HEAD" ? "outline" : "default"}>
                      {ep.method}
                    </Badge>
                    <span className="font-mono text-xs">{ep.endpoint}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{ep.count}×</span>
                    <span className="text-muted-foreground text-xs">
                      {ep.avgTime.toFixed(0)}ms
                    </span>
                    {ep.duplicates > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {ep.duplicates} dup
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {stats.endpoints.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum request nos últimos 30 segundos
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
