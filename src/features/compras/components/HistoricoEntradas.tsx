import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, FileText, Store, Upload, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { comprasApi } from "../services/comprasApi";

interface HistoricoEntradasProps {
  onImportXml?: () => void;
  onManualEntry?: () => void;
}

export function HistoricoEntradas({ onImportXml, onManualEntry }: HistoricoEntradasProps) {
  const { data: notas, isLoading } = useQuery({
    queryKey: ['historico-entradas'],
    queryFn: comprasApi.getHistoricoEntradas,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalizada': return <Badge className="bg-emerald-500/10 text-emerald-500">Finalizada</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      case 'importada': return <Badge variant="secondary">Importada</Badge>;
      case 'conferindo': return <Badge className="bg-yellow-500/10 text-yellow-500">Em Conferência</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isManualEntry = (chave: string | null) =>
    !chave || chave.startsWith("MANUAL-");

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  if (isLoading) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle>Histórico de Entradas</CardTitle>
          <CardDescription>Carregando notas fiscais...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle>Histórico de Entradas</CardTitle>
        </div>
        <CardDescription>
          Últimas compras e notas fiscais que deram entrada no estoque
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!notas || notas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="rounded-full bg-primary/10 p-5 mb-5">
              <Package className="h-10 w-10 text-primary opacity-80" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Ainda sem entradas registradas
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Importe o XML do fornecedor ou registre manualmente sua primeira compra.
              O estoque atualiza automaticamente a cada entrada.
            </p>
            <div className="flex items-center gap-3">
              {onImportXml && (
                <Button onClick={onImportXml}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar XML
                </Button>
              )}
              {onManualEntry && (
                <Button variant="outline" className="border-border" onClick={onManualEntry}>
                  <Plus className="w-4 h-4 mr-2" />
                  Entrada Manual
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nota</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data de Emissão</TableHead>
                  <TableHead>Data de Entrada</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nota: any) => (
                  <TableRow key={nota.id} className="border-border">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        Nº {nota.numero}
                        {isManualEntry(nota.chave_acesso) && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">Manual</Badge>
                        )}
                      </div>
                      {nota.chave_acesso && !isManualEntry(nota.chave_acesso) && (
                        <div className="text-xs text-muted-foreground truncate w-32 md:w-48" title={nota.chave_acesso}>
                          {nota.chave_acesso}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="truncate max-w-[200px]">
                          {nota.fornecedores?.nome_fantasia || nota.fornecedores?.razao_social}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {nota.data_emissao ? format(new Date(nota.data_emissao), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>
                      {nota.data_entrada ? format(new Date(nota.data_entrada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatarMoeda(nota.valor_total || 0)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(nota.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
