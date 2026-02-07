import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { 
  ArrowLeft, Download, Mail, FileDown, Copy, CheckCircle2, Clock, 
  XCircle, X, FileText, AlertTriangle, Loader2, ExternalLink
} from "lucide-react";
import { usePinAuth } from "@/contexts/PinAuthContext";
import AccessDenied from "@/components/auth/AccessDenied";
import NotFoundResource from "@/components/auth/NotFoundResource";

type NotaFiscal = {
  id: string;
  tipo: "nfe" | "nfce" | "nfse";
  numero: number;
  serie: number;
  chave_acesso: string | null;
  status: "rascunho" | "processando" | "autorizada" | "cancelada" | "rejeitada";
  motivo_rejeicao: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cpf_cnpj: string | null;
  cliente_endereco: string | null;
  atendimento_id: string | null;
  valor_total: number;
  valor_servicos: number;
  valor_produtos: number;
  valor_desconto: number;
  base_calculo_icms: number;
  valor_icms: number;
  base_calculo_iss: number;
  valor_iss: number;
  data_emissao: string;
  data_autorizacao: string | null;
  data_cancelamento: string | null;
  protocolo: string | null;
  xml_path: string | null;
  pdf_path: string | null;
  observacoes: string | null;
};

type ItemNotaFiscal = {
  id: string;
  tipo: "servico" | "produto";
  codigo: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  aliquota_icms: number;
  aliquota_iss: number;
};

const STATUS_CONFIG = {
  rascunho: { label: "Rascunho", color: "bg-info text-info-foreground", icon: FileText },
  processando: { label: "Processando", color: "bg-warning text-warning-foreground", icon: Clock },
  autorizada: { label: "Autorizada", color: "bg-success text-success-foreground", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: X },
  rejeitada: { label: "Rejeitada", color: "bg-destructive text-destructive-foreground", icon: XCircle },
};

export default function NotaFiscalDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canAccessRoute, isAuthenticated, loading: authLoading } = usePinAuth();
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Check permission before any data loading
  const hasPermission = canAccessRoute('/nota-fiscal');

  // Query para buscar nota fiscal - only if has permission and valid id
  const { data: nota, isLoading, error } = useQuery({
    queryKey: ["nota-fiscal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as NotaFiscal | null;
    },
    enabled: !!id && hasPermission && isAuthenticated && !authLoading,
  });

  // Query para buscar itens - only if has permission
  const { data: itens } = useQuery({
    queryKey: ["itens-nota-fiscal", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("itens_nota_fiscal")
        .select("*")
        .eq("nota_fiscal_id", id);
      if (error) throw error;
      return data as ItemNotaFiscal[];
    },
    enabled: !!id && hasPermission && isAuthenticated && !authLoading,
  });

  // Mutation para cancelar
  const cancelarMutation = useMutation({
    mutationFn: async ({ notaId, motivo }: { notaId: string; motivo: string }) => {
      const { error } = await supabase
        .from("notas_fiscais")
        .update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
          motivo_rejeicao: motivo,
        })
        .eq("id", notaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal cancelada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["nota-fiscal", id] });
      setModalCancelarAberto(false);
      setMotivoCancelamento("");
    },
    onError: (error) => {
      toast.error("Erro ao cancelar nota: " + error.message);
    },
  });

  const formatarNumero = (numero: number) => {
    return numero.toString().padStart(6, "0");
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const copiarChave = () => {
    if (nota?.chave_acesso) {
      navigator.clipboard.writeText(nota.chave_acesso.replace(/\s/g, ""));
      setCopiado(true);
      toast.success("Chave copiada!");
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const podeSerCancelada = (nota: NotaFiscal) => {
    if (nota.status !== "autorizada") return false;
    const dataEmissao = parseISO(nota.data_emissao);
    const horasDesdeEmissao = (Date.now() - dataEmissao.getTime()) / (1000 * 60 * 60);
    return horasDesdeEmissao <= 24;
  };

  const handleCancelar = () => {
    if (!nota) return;
    if (motivoCancelamento.length < 15) {
      toast.error("O motivo deve ter pelo menos 15 caracteres");
      return;
    }
    setCancelando(true);
    cancelarMutation.mutate({ notaId: nota.id, motivo: motivoCancelamento });
    setCancelando(false);
  };

  // Check auth loading state first
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check permission before showing any content
  if (!hasPermission) {
    return <AccessDenied message="Você não tem permissão para visualizar notas fiscais." />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!nota) {
    return (
      <NotFoundResource 
        resourceName="Nota Fiscal"
        backPath="/notas-fiscais"
        backLabel="Voltar para lista"
      />
    );
  }

  const StatusIcon = STATUS_CONFIG[nota.status].icon;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notas-fiscais")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {nota.tipo.toUpperCase()} Nº {formatarNumero(nota.numero)}
              </h1>
              <Badge className={`gap-1 ${STATUS_CONFIG[nota.status].color}`}>
                <StatusIcon className="h-3 w-3" />
                {STATUS_CONFIG[nota.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {format(parseISO(nota.data_emissao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {nota.status === "autorizada" && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              XML
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações da Nota */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Nota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {nota.chave_acesso && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Chave de Acesso</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm break-all">
                      {nota.chave_acesso}
                    </code>
                    <Button variant="outline" size="icon" onClick={copiarChave}>
                      {copiado ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-muted-foreground">Série/Número</Label>
                  <p className="font-medium">{nota.serie}/{formatarNumero(nota.numero)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium uppercase">{nota.tipo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data Emissão</Label>
                  <p className="font-medium">
                    {format(parseISO(nota.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {nota.data_autorizacao && (
                  <div>
                    <Label className="text-muted-foreground">Data Autorização</Label>
                    <p className="font-medium">
                      {format(parseISO(nota.data_autorizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {nota.protocolo && (
                <div>
                  <Label className="text-muted-foreground">Protocolo</Label>
                  <p className="font-mono font-medium">{nota.protocolo}</p>
                </div>
              )}

              {nota.status === "rejeitada" && nota.motivo_rejeicao && (
                <div className="rounded-lg border border-destructive/50 bg-destructive-bg p-4">
                  <div className="flex gap-2">
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-medium text-destructive-text">Motivo da Rejeição</p>
                      <p className="text-sm text-muted-foreground mt-1">{nota.motivo_rejeicao}</p>
                    </div>
                  </div>
                </div>
              )}

              {nota.status === "cancelada" && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex gap-2">
                    <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">Nota Cancelada</p>
                      {nota.data_cancelamento && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Cancelada em {format(parseISO(nota.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      {nota.motivo_rejeicao && (
                        <p className="text-sm text-muted-foreground mt-1">Motivo: {nota.motivo_rejeicao}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{nota.cliente_nome || "Consumidor Final"}</p>
                </div>
                {nota.cliente_cpf_cnpj && (
                  <div>
                    <Label className="text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium">{nota.cliente_cpf_cnpj}</p>
                  </div>
                )}
                {nota.cliente_endereco && (
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{nota.cliente_endereco}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Nota</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">CFOP</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Valor Un</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.tipo === "servico" ? "Serv" : "Prod"}
                          </Badge>
                          {item.descricao}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono">{item.cfop}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{formatarValor(item.valor_unitario)}</TableCell>
                      <TableCell className="text-right font-medium">{formatarValor(item.valor_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Serviços</span>
                <span>{formatarValor(nota.valor_servicos || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Produtos</span>
                <span>{formatarValor(nota.valor_produtos || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descontos</span>
                <span className="text-destructive">-{formatarValor(nota.valor_desconto || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatarValor(nota.valor_total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Valores Fiscais */}
          <Card>
            <CardHeader>
              <CardTitle>Valores Fiscais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Cálc. ISS</span>
                <span>{formatarValor(nota.base_calculo_iss || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor ISS</span>
                <span>{formatarValor(nota.valor_iss || 0)}</span>
              </div>
              {(nota.base_calculo_icms || 0) > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Cálc. ICMS</span>
                    <span>{formatarValor(nota.base_calculo_icms || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor ICMS</span>
                    <span>{formatarValor(nota.valor_icms || 0)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          {nota.status === "autorizada" && (
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {podeSerCancelada(nota) && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive hover:text-destructive gap-2"
                    onClick={() => setModalCancelarAberto(true)}
                  >
                    <X className="h-4 w-4" />
                    Cancelar Nota
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Carta de Correção
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <a href={`https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Consultar na SEFAZ
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {nota.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{nota.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Cancelar */}
      <Dialog open={modalCancelarAberto} onOpenChange={setModalCancelarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Nota Fiscal
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A nota será cancelada junto à SEFAZ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Número:</span>
                  <span className="ml-2 font-medium">{formatarNumero(nota.numero)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="ml-2 font-medium">{formatarValor(nota.valor_total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="motivo"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Erro no valor, Cliente desistiu, Duplicidade..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 15 caracteres ({motivoCancelamento.length}/15)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCancelarAberto(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelar}
              disabled={cancelando || motivoCancelamento.length < 15}
            >
              {cancelando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
