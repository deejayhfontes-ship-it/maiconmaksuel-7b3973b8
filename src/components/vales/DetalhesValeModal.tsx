import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Printer,
  User,
  Receipt,
  CreditCard,
} from "lucide-react";
import { format, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_lancamento: string;
  data_quitacao: string | null;
  motivo: string;
  observacoes: string | null;
  forma_desconto: "unico" | "parcelado";
  parcelas_total: number | null;
  parcelas_pagas: number;
  status: "aberto" | "quitado" | "cancelado";
  quitado_por: string | null;
  comprovante_url: string | null;
  created_at: string;
  profissional?: {
    id: string;
    nome: string;
    funcao: string | null;
    foto_url: string | null;
  };
}

interface DetalhesValeModalProps {
  open: boolean;
  onClose: () => void;
  vale: Vale | null;
}

const DetalhesValeModal = ({ open, onClose, vale }: DetalhesValeModalProps) => {
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const handlePrint = () => {
    toast({ title: "Gerando PDF...", description: "Em desenvolvimento." });
  };

  if (!vale) return null;

  // Gerar lista de parcelas
  const parcelas = [];
  if (vale.forma_desconto === "parcelado" && vale.parcelas_total) {
    const valorParcela = vale.valor_total / vale.parcelas_total;
    const dataInicio = parseISO(vale.data_lancamento);

    for (let i = 1; i <= vale.parcelas_total; i++) {
      const vencimento = addMonths(dataInicio, i);
      const paga = i <= vale.parcelas_pagas;
      const proxima = i === vale.parcelas_pagas + 1 && vale.status === "aberto";

      parcelas.push({
        numero: i,
        vencimento,
        valor: valorParcela,
        paga,
        proxima,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalhes do Vale</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="informacoes" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="parcelas" disabled={vale.forma_desconto !== "parcelado"}>
              Parcelas
            </TabsTrigger>
            <TabsTrigger value="documentos" disabled={!vale.comprovante_url}>
              Documentos
            </TabsTrigger>
          </TabsList>

          {/* Tab Informações */}
          <TabsContent value="informacoes" className="mt-4 space-y-4">
            {/* Profissional */}
            <Card className="border-0 bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={vale.profissional?.foto_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(vale.profissional?.nome || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{vale.profissional?.nome}</p>
                    <p className="text-muted-foreground">{vale.profissional?.funcao || "Profissional"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(vale.valor_total)}</p>
                    <Badge
                      className={
                        vale.status === "aberto"
                          ? "bg-amber-500/10 text-amber-600"
                          : vale.status === "quitado"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {vale.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Data de Lançamento</span>
                  </div>
                  <p className="font-medium">{format(parseISO(vale.data_lancamento), "dd/MM/yyyy")}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Forma de Desconto</span>
                  </div>
                  <p className="font-medium">
                    {vale.forma_desconto === "parcelado"
                      ? `Parcelado em ${vale.parcelas_total}x`
                      : "Desconto Único"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    <span className="text-sm">Valor Pago</span>
                  </div>
                  <p className="font-medium" style={{ color: "#34C759" }}>
                    {formatCurrency(vale.valor_pago)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    <span className="text-sm">Saldo Restante</span>
                  </div>
                  <p
                    className="font-medium"
                    style={{ color: vale.saldo_restante > 0 ? "#FF3B30" : "#34C759" }}
                  >
                    {formatCurrency(vale.saldo_restante)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Motivo */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Motivo</span>
                </div>
                <p className="text-foreground">{vale.motivo}</p>
              </CardContent>
            </Card>

            {/* Observações */}
            {vale.observacoes && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Observações</span>
                  </div>
                  <p className="text-foreground">{vale.observacoes}</p>
                </CardContent>
              </Card>
            )}

            {/* Progresso (se parcelado) */}
            {vale.forma_desconto === "parcelado" && vale.parcelas_total && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Progresso</span>
                    <span className="text-sm font-medium">
                      {vale.parcelas_pagas}/{vale.parcelas_total} parcelas
                    </span>
                  </div>
                  <Progress
                    value={(vale.parcelas_pagas / vale.parcelas_total) * 100}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {Math.round((vale.parcelas_pagas / vale.parcelas_total) * 100)}% concluído
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Info Quitação */}
            {vale.status === "quitado" && vale.data_quitacao && (
              <Card className="border-0" style={{ backgroundColor: "#34C75910" }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5" style={{ color: "#34C759" }} />
                    <span className="font-medium" style={{ color: "#34C759" }}>
                      Vale Quitado
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quitado em {format(parseISO(vale.data_quitacao), "dd/MM/yyyy")}
                    {vale.quitado_por && (
                      <span>
                        {" "}
                        • Via{" "}
                        {vale.quitado_por === "comissao"
                          ? "desconto em comissão"
                          : vale.quitado_por === "dinheiro"
                          ? "pagamento em dinheiro"
                          : vale.quitado_por}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Parcelas */}
          <TabsContent value="parcelas" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((parcela) => (
                      <TableRow
                        key={parcela.numero}
                        className={parcela.proxima ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-medium">{parcela.numero}</TableCell>
                        <TableCell>
                          {format(parcela.vencimento, "MMM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(parcela.valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          {parcela.paga ? (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle className="h-4 w-4" style={{ color: "#34C759" }} />
                              <span className="text-sm" style={{ color: "#34C759" }}>
                                Paga
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-4 w-4 text-amber-500" />
                              <span className="text-sm text-amber-500">
                                {parcela.proxima ? "Próxima" : "Pendente"}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Documentos */}
          <TabsContent value="documentos" className="mt-4">
            {vale.comprovante_url ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-muted-foreground mb-4">Comprovante anexado:</p>
                  <a
                    href={vale.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Ver comprovante
                  </a>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum documento anexado</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DetalhesValeModal;
