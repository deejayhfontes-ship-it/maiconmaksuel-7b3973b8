import { useState } from 'react';
import { AlertTriangle, Shield, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MotivoCategoriaAuditoria } from '@/hooks/useComandaAuditoria';

export type AcaoAuditoria =
  | 'reaberta'
  | 'cancelada'
  | 'item_removido'
  | 'item_adicionado'
  | 'desconto_alterado'
  | 'cliente_alterado';

interface ComandaAuditoriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acao: AcaoAuditoria;
  numeroComanda: number;
  clienteNome?: string | null;
  valorComanda?: number;
  onConfirmar: (motivo: string, categoria: MotivoCategoriaAuditoria) => Promise<void>;
}

const MOTIVO_MIN_CHARS = 20;

const acaoLabels: Record<AcaoAuditoria, { label: string; cor: string; descricao: string; icone: string }> = {
  reaberta: {
    label: 'REABRIR COMANDA',
    cor: 'text-amber-600 bg-amber-50 border-amber-200',
    descricao: 'A comanda voltará para o status "Reaberta" e poderá ser editada. O valor será estornado do caixa.',
    icone: '🔓',
  },
  cancelada: {
    label: 'CANCELAR COMANDA',
    cor: 'text-red-600 bg-red-50 border-red-200',
    descricao: 'A comanda será marcada como cancelada permanentemente. Esta ação não pode ser desfeita.',
    icone: '❌',
  },
  item_removido: {
    label: 'REMOVER ITEM',
    cor: 'text-orange-600 bg-orange-50 border-orange-200',
    descricao: 'Um item será removido desta comanda fechada. O valor não será estornado automaticamente.',
    icone: '🗑️',
  },
  item_adicionado: {
    label: 'ADICIONAR ITEM',
    cor: 'text-blue-600 bg-blue-50 border-blue-200',
    descricao: 'Um item será adicionado a esta comanda já fechada.',
    icone: '➕',
  },
  desconto_alterado: {
    label: 'ALTERAR DESCONTO',
    cor: 'text-purple-600 bg-purple-50 border-purple-200',
    descricao: 'O valor do desconto será alterado nesta comanda fechada.',
    icone: '💰',
  },
  cliente_alterado: {
    label: 'TROCAR CLIENTE',
    cor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    descricao: 'O cliente vinculado a esta comanda será alterado.',
    icone: '👤',
  },
};

const categorias: { value: MotivoCategoriaAuditoria; label: string; desc: string }[] = [
  { value: 'erro_lancamento',      label: '🖊️ Erro de lançamento',       desc: 'Item ou valor lançado incorretamente' },
  { value: 'solicitacao_cliente',  label: '👤 Solicitação do cliente',    desc: 'Cliente pediu a alteração' },
  { value: 'correcao_financeira',  label: '💰 Correção financeira',       desc: 'Ajuste em valor, desconto ou pagamento' },
  { value: 'item_errado',          label: '✂️ Serviço/produto errado',    desc: 'Item diferente do realizado' },
  { value: 'desconto_aplicado',    label: '🏷️ Desconto / cortesia',       desc: 'Desconto ou brinde aplicado' },
  { value: 'outro',                label: '📝 Outro motivo',              desc: 'Especifique no campo abaixo' },
];

const formatPrice = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ComandaAuditoriaModal({
  open,
  onOpenChange,
  acao,
  numeroComanda,
  clienteNome,
  valorComanda,
  onConfirmar,
}: ComandaAuditoriaModalProps) {
  const [motivo, setMotivo]           = useState('');
  const [categoria, setCategoria]     = useState<MotivoCategoriaAuditoria | ''>('');
  const [loading, setLoading]         = useState(false);

  const info         = acaoLabels[acao];
  const chars        = motivo.trim().length;
  const motivoValido = chars >= MOTIVO_MIN_CHARS;
  const categoriaOk  = categoria !== '';
  const podeConfirmar = motivoValido && categoriaOk && !loading;

  const handleConfirmar = async () => {
    if (!podeConfirmar) return;
    setLoading(true);
    try {
      await onConfirmar(motivo.trim(), categoria as MotivoCategoriaAuditoria);
      setMotivo('');
      setCategoria('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      setCategoria('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-destructive/10 text-2xl leading-none">
              {info.icone}
            </div>
            <div>
              <DialogTitle className="text-destructive">Ação Auditada</DialogTitle>
              <DialogDescription className="mt-0.5">
                Esta ação será registrada <strong>permanentemente</strong> e não pode ser apagada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Banner da ação */}
        <div className={cn('rounded-lg border px-4 py-3', info.cor)}>
          <p className="font-bold text-sm">{info.label}</p>
          <p className="text-sm mt-0.5 opacity-90">{info.descricao}</p>
        </div>

        {/* Dados da comanda */}
        <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Comanda</span>
            <span className="font-bold text-base">#{String(numeroComanda).padStart(3, '0')}</span>
          </div>
          {clienteNome && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clienteNome}</span>
            </div>
          )}
          {valorComanda !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-semibold text-primary">{formatPrice(valorComanda)}</span>
            </div>
          )}
        </div>

        {/* Categoria do motivo */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 font-semibold">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            Categoria do Motivo <span className="text-destructive">*</span>
          </Label>
          <Select value={categoria} onValueChange={(v) => setCategoria(v as MotivoCategoriaAuditoria)}>
            <SelectTrigger className={cn(!categoria && 'border-dashed')}>
              <SelectValue placeholder="Selecione o tipo de ocorrência..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div>
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!categoria && (
            <p className="text-xs text-muted-foreground">Selecione a categoria antes de continuar</p>
          )}
        </div>

        {/* Justificativa */}
        <div className="space-y-1.5">
          <Label htmlFor="motivo-auditoria" className="flex items-center gap-1.5 font-semibold">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Justificativa Detalhada <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo-auditoria"
            placeholder="Descreva com clareza o que aconteceu e por que essa ação é necessária (mínimo 20 caracteres)..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className={cn(
              'resize-none',
              chars > 0 && !motivoValido && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs',
              chars === 0 && 'text-muted-foreground',
              chars > 0 && !motivoValido && 'text-destructive',
              motivoValido && 'text-green-600'
            )}>
              {chars === 0
                ? `Mínimo ${MOTIVO_MIN_CHARS} caracteres obrigatório`
                : !motivoValido
                ? `Faltam ${MOTIVO_MIN_CHARS - chars} caracteres`
                : '✓ Justificativa válida'}
            </span>
            <span className={cn(
              'text-xs font-mono',
              !motivoValido ? 'text-muted-foreground' : 'text-green-600'
            )}>
              {chars}/{MOTIVO_MIN_CHARS}+
            </span>
          </div>
        </div>

        {/* Aviso de auditoria permanente */}
        <div className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-destructive mb-0.5">Registro Imutável</p>
            <p className="text-xs text-muted-foreground">
              Toda alteração em comanda fechada é registrada com seu nome, data, horário e{' '}
              <strong>não pode ser apagada ou editada</strong>.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={!podeConfirmar}
            className="min-w-[160px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Registrando...
              </span>
            ) : (
              'Confirmar e Registrar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
