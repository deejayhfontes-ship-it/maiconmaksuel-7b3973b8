import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { useNotaFiscalService } from "@/hooks/useNotaFiscal";

interface FiscalLogsDialogProps {
  open: boolean;
  onClose: () => void;
  notaId: string | null;
  notaNumero?: number | string;
}

interface FiscalLog {
  id: string;
  acao: string;
  tipo_documento: string;
  codigo_retorno: string | null;
  mensagem_retorno: string | null;
  provider: string;
  ambiente: string;
  tentativa: number;
  duracao_ms: number | null;
  created_at: string;
}

const acaoLabels: Record<string, string> = {
  emitir: "Emissão NF-e/NFC-e",
  emitir_nfse: "Emissão NFS-e",
  cancelar: "Cancelamento",
  cancelar_nfse: "Cancelamento NFS-e",
  carta_correcao: "Carta de Correção",
  inutilizar: "Inutilização",
  consultar: "Consulta",
  status_sefaz: "Status SEFAZ",
  webhook_autorizado: "Webhook: Autorizado",
  webhook_rejeitado: "Webhook: Rejeitado",
  webhook_cancelado: "Webhook: Cancelado",
};

function getStatusIcon(codigo: string | null) {
  if (!codigo) return <Clock className="h-4 w-4 text-muted-foreground" />;
  if (codigo === "100" || codigo === "135" || codigo === "101") {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  if (codigo === "ERRO" || Number(codigo) >= 200) {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
}

function getStatusBadge(codigo: string | null) {
  if (!codigo) return <Badge variant="outline">—</Badge>;
  if (codigo === "100") return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">100 - Autorizado</Badge>;
  if (codigo === "135") return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">135 - Cancelado</Badge>;
  if (codigo === "101") return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">101 - Cancelamento OK</Badge>;
  return <Badge variant="destructive">{codigo} - Rejeição</Badge>;
}

export default function FiscalLogsDialog({
  open,
  onClose,
  notaId,
  notaNumero,
}: FiscalLogsDialogProps) {
  const nfService = useNotaFiscalService();
  const [logs, setLogs] = useState<FiscalLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && notaId) {
      setLoading(true);
      nfService
        .buscarLogs(notaId)
        .then((data) => {
          setLogs(data as FiscalLog[]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notaId]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs Fiscais {notaNumero ? `— Nota #${notaNumero}` : ""}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum log fiscal encontrado para esta nota.</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.codigo_retorno)}
                      <div>
                        <p className="font-medium text-sm">
                          {acaoLabels[log.acao] || log.acao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          {log.duracao_ms && ` • ${log.duracao_ms}ms`}
                          {log.tentativa > 1 && ` • Tentativa ${log.tentativa}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(log.codigo_retorno)}
                      <Badge variant="outline" className="text-xs">
                        {log.ambiente === "1" ? "Produção" : "Homolog."}
                      </Badge>
                    </div>
                  </div>

                  {log.mensagem_retorno && (
                    <div className="mt-2 px-6">
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2 font-mono text-xs leading-relaxed">
                        {log.mensagem_retorno}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
