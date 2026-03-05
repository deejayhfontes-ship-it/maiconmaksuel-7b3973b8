import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  History,
  Download,
  Trash2,
  Search,
  Filter,
  FileText,
  Calendar,
  User,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRelatoriosHistorico, ReportCategory } from '@/hooks/useRelatoriosHistorico';

const categoryColors: Record<ReportCategory, string> = {
  vendas: 'bg-green-500/10 text-green-700 border-green-200',
  clientes: 'bg-blue-500/10 text-blue-700 border-blue-200',
  profissionais: 'bg-purple-500/10 text-purple-700 border-purple-200',
  estoque: 'bg-orange-500/10 text-orange-700 border-orange-200',
  financeiro: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  crediario: 'bg-red-500/10 text-red-700 border-red-200',
  caixa: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  consolidado: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export function RelatoriosHistorico() {
  const {
    relatorios,
    loading,
    error,
    fetchRelatorios,
    deleteRelatorio,
    downloadPdf,
    categoryLabels,
  } = useRelatoriosHistorico();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtered reports
  const filteredRelatorios = useMemo(() => {
    return relatorios.filter((r) => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.report_subtype.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || r.report_type === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [relatorios, searchTerm, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = relatorios.length;
    const thisMonth = relatorios.filter((r) => {
      const date = new Date(r.generated_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const withPdf = relatorios.filter((r) => r.pdf_url).length;
    return { total, thisMonth, withPdf };
  }, [relatorios]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteRelatorio(deleteId);
      setDeleteId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchRelatorios()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Relatórios</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gerados Este Mês</CardDescription>
            <CardTitle className="text-2xl">{stats.thisMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com PDF Disponível</CardDescription>
            <CardTitle className="text-2xl">{stats.withPdf}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Histórico de Relatórios</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchRelatorios()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <CardDescription>
            Visualize e baixe relatórios gerados anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val as ReportCategory | 'all')}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchTerm || categoryFilter !== 'all') && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRelatorios.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {relatorios.length === 0
                  ? 'Nenhum relatório gerado ainda'
                  : 'Nenhum relatório encontrado com os filtros aplicados'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Relatório</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Gerado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRelatorios.map((relatorio) => (
                    <TableRow key={relatorio.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{relatorio.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {relatorio.report_subtype}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={categoryColors[relatorio.report_type]}
                        >
                          {categoryLabels[relatorio.report_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {relatorio.date_start && relatorio.date_end ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(relatorio.date_start), 'dd/MM/yy', { locale: ptBR })} -{' '}
                            {format(new Date(relatorio.date_end), 'dd/MM/yy', { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{relatorio.total_records}</TableCell>
                      <TableCell>
                        {relatorio.total_value > 0 ? formatValue(relatorio.total_value) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          <div>
                            <p>
                              {format(new Date(relatorio.generated_at), "dd/MM/yy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {relatorio.generated_by}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {relatorio.pdf_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPdf(relatorio)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(relatorio.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório e seu PDF (se existir) serão
              permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
