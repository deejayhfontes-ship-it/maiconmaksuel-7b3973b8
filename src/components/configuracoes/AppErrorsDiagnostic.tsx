import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Copy, Check, AlertTriangle, Bug, Play } from "lucide-react";
import { getErrorLogs, clearErrorLogs } from "@/components/ErrorBoundary";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AppErrorsDiagnostic() {
  const [logs, setLogs] = useState(getErrorLogs());
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleClear = () => {
    clearErrorLogs();
    setLogs([]);
    toast.success("Logs limpos");
  };

  const handleCopy = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTestNavigation = () => {
    try {
      navigate("/clientes");
      setTestResult("✅ Navegação para /clientes executada sem erro");
    } catch (e: any) {
      setTestResult(`❌ Erro: ${e.message}`);
    }
  };

  const typeColor = (t: string) => {
    if (t === "render") return "destructive";
    if (t === "promise") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Erros do App ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copiado!" : "Copiar relatório"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" /> Limpar logs
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestNavigation}>
              <Play className="h-4 w-4 mr-1" /> Testar /clientes
            </Button>
          </div>

          {testResult && (
            <p className="text-sm p-2 rounded bg-muted">{testResult}</p>
          )}

          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum erro registrado. Ótimo!
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="border rounded-md p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                      <Badge variant={typeColor(log.type) as any} className="text-[10px]">
                        {log.type}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="font-medium truncate">{log.message}</p>
                    <p className="text-muted-foreground truncate">{log.route}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Informações do Ambiente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Protocol:</span>
            <span className="font-mono">{window.location.protocol}</span>
            <span className="text-muted-foreground">Origin:</span>
            <span className="font-mono truncate">{window.location.origin}</span>
            <span className="text-muted-foreground">Router:</span>
            <span className="font-mono">
              {window.location.protocol === "file:" ? "HashRouter" : "BrowserRouter"}
            </span>
            <span className="text-muted-foreground">Base:</span>
            <span className="font-mono">./</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
