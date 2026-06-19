import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, FileText, Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { comprasApi } from "../services/comprasApi";

export function HistoricoEntradas() {
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

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  if (isLoading) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle>Histórico de Entradas</CardTitle>
          <CardDescription>Carregando notas fiscais...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle>Histórico de Entradas</CardTitle>
        </div>
        <CardDescription>
          Visualize as últimas compras e notas fiscais que deram entrada no estoque
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!notas || notas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-4 opacity-20" />
            <p>Nenhuma nota fiscal de entrada registrada.</p>
            <p className="text-sm">Importe um XML de fornecedor para começar.</p>
          </div>
        ) : (
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
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
                  <TableRow key={nota.id} className="border-white/10">
                    <TableCell className="font-medium">
                      Nº {nota.numero}
                      <div className="text-xs text-muted-foreground truncate w-32 md:w-48" title={nota.chave_acesso}>
                        {nota.chave_acesso}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
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
