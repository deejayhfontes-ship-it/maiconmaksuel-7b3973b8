import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { ExportData, ExportOptions, exportarRelatorio } from '@/utils/exportUtils';
import { toast } from 'sonner';

interface BotaoExportarProps {
  dados: ExportData;
  nomeArquivo: string;
  formatos?: ('pdf' | 'excel' | 'csv')[];
  periodoInicial?: Date;
  periodoFinal?: Date;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function BotaoExportar({
  dados,
  nomeArquivo,
  formatos = ['pdf', 'excel', 'csv'],
  periodoInicial,
  periodoFinal,
  variant = 'outline',
  size = 'default',
  className,
}: BotaoExportarProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formato, setFormato] = useState<'pdf' | 'excel' | 'csv'>(formatos[0]);
  const [incluirGraficos, setIncluirGraficos] = useState(true);
  const [incluirCabecalho, setIncluirCabecalho] = useState(true);
  const [incluirRodape, setIncluirRodape] = useState(true);
  const [incluirResumo, setIncluirResumo] = useState(true);
  const [incluirDetalhes, setIncluirDetalhes] = useState(true);
  const [incluirObservacoes, setIncluirObservacoes] = useState(false);
  const [orientacao, setOrientacao] = useState<'portrait' | 'landscape'>('portrait');
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(periodoInicial);
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(periodoFinal);

  const handleExportar = async () => {
    setLoading(true);
    
    try {
      const options: ExportOptions = {
        formato,
        incluirGraficos,
        incluirCabecalho,
        incluirRodape,
        incluirResumo,
        incluirDetalhes,
        incluirObservacoes,
        orientacao,
        periodoInicio,
        periodoFim,
      };

      await exportarRelatorio(dados, options, nomeArquivo);
      
      toast.success('Relatório exportado com sucesso!', {
        description: `Arquivo ${nomeArquivo}.${formato === 'excel' ? 'xlsx' : formato} gerado.`,
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar relatório', {
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={cn('gap-2', className)}>
          <Download className="h-4 w-4" />
          {size !== 'icon' && 'Exportar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Relatório
          </DialogTitle>
          <DialogDescription>
            Escolha o formato e as opções de exportação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formato */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato</Label>
            <RadioGroup
              value={formato}
              onValueChange={(v) => setFormato(v as 'pdf' | 'excel' | 'csv')}
              className="space-y-2"
            >
              {formatos.includes('pdf') && (
                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <FileText className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <Label htmlFor="pdf" className="cursor-pointer font-medium">PDF</Label>
                    <p className="text-xs text-muted-foreground">Recomendado para visualização</p>
                  </div>
                </div>
              )}
              {formatos.includes('excel') && (
                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="excel" id="excel" />
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <Label htmlFor="excel" className="cursor-pointer font-medium">Excel (.xlsx)</Label>
                    <p className="text-xs text-muted-foreground">Editável em planilhas</p>
                  </div>
                </div>
              )}
              {formatos.includes('csv') && (
                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="csv" id="csv" />
                  <FileDown className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <Label htmlFor="csv" className="cursor-pointer font-medium">CSV</Label>
                    <p className="text-xs text-muted-foreground">Compatível com todas as planilhas</p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opções</Label>
            <div className="space-y-2">
              {formato === 'pdf' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cabecalho"
                      checked={incluirCabecalho}
                      onCheckedChange={(v) => setIncluirCabecalho(!!v)}
                    />
                    <Label htmlFor="cabecalho" className="text-sm cursor-pointer">
                      Incluir cabeçalho com logo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rodape"
                      checked={incluirRodape}
                      onCheckedChange={(v) => setIncluirRodape(!!v)}
                    />
                    <Label htmlFor="rodape" className="text-sm cursor-pointer">
                      Incluir rodapé com data/hora
                    </Label>
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resumo"
                  checked={incluirResumo}
                  onCheckedChange={(v) => setIncluirResumo(!!v)}
                />
                <Label htmlFor="resumo" className="text-sm cursor-pointer">
                  Incluir resumo executivo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detalhes"
                  checked={incluirDetalhes}
                  onCheckedChange={(v) => setIncluirDetalhes(!!v)}
                />
                <Label htmlFor="detalhes" className="text-sm cursor-pointer">
                  Incluir dados detalhados
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="observacoes"
                  checked={incluirObservacoes}
                  onCheckedChange={(v) => setIncluirObservacoes(!!v)}
                />
                <Label htmlFor="observacoes" className="text-sm cursor-pointer">
                  Incluir observações
                </Label>
              </div>
            </div>
          </div>

          {/* Período */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !periodoInicio && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodoInicio ? format(periodoInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodoInicio}
                    onSelect={setPeriodoInicio}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="flex items-center text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !periodoFim && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodoFim ? format(periodoFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={periodoFim}
                    onSelect={setPeriodoFim}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Orientação (apenas PDF) */}
          {formato === 'pdf' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Orientação</Label>
              <RadioGroup
                value={orientacao}
                onValueChange={(v) => setOrientacao(v as 'portrait' | 'landscape')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="portrait" id="portrait" />
                  <Label htmlFor="portrait" className="cursor-pointer">Retrato</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="landscape" id="landscape" />
                  <Label htmlFor="landscape" className="cursor-pointer">Paisagem</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExportar} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar e Baixar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BotaoExportar;
