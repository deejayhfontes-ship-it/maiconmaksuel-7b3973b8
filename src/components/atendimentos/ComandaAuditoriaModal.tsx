import { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export type AcaoAuditoria = 'reaberta' | 'cancelada' | 'item_removido' | 'item_adicionado' | 'desconto_alterado' | 'cliente_alterado';

interface ComandaAuditoriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acao: AcaoAuditoria;
  numeroComanda: number;
  clienteNome?: string | null;
  valorComanda?: number;
  onConfirmar: (motivo: string) => Promise<void>;
}

const acaoLabels: Record<AcaoAuditoria, { label: string; cor: string; descricao: string }> = {
  reaberta: {
    label: 'REABRIR COMANDA',
    cor: 'text-amber-600 bg-amber-50 border-amber-200',
    descricao: 'A comanda voltará para o status "Aberta" e poderá ser editada. O valor será estornado do caixa.',
  },
  cancelada: {
    label: 'CANCELAR COMANDA',
    cor: 'text-red-600 bg-red-50 border-red-200',
    descricao: 'A comanda será marcada como cancelada permanentemente. Esta ação não pode ser desfeita.',
  },
  item_removido: {
    label: 'REMOVER ITEM',
    cor: 'text-orange-600 bg-orange-50 border-orange-200',
    descricao: 'Um item será removido desta comanda fechada. O valor não será estornado automaticamente.',
  },
  item_adicionado: {
    label: 'ADICIONAR ITEM',
    cor: 'text-blue-600 bg-blue-50 border-blue-200',
    descricao: 'Um item será adicionado a esta comanda já fechada.',
  },
  desconto_alterado: {
    label: 'ALTERAR DESCONTO',
    cor: 'text-purple-600 bg-purple-50 border-purple-200',
    descricao: 'O valor do desconto será alterado nesta comanda fechada.',
  },
  cliente_alterado: {
    label: 'TROCAR CLIENTE',
    cor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    descricao: 'O cliente vinculado a esta comanda será alterado.',
  },
};

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
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const info = acaoLabels[acao];

  const handleConfirmar = async () => {
    if (!motivo.trim() || motivo.trim().length < 5) return;
    setLoading(true);
    try {
      await onConfirmar(motivo.trim());
      setMotivo('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive">Ação Auditada</DialogTitle>
              <DialogDescription className="mt-0.5">
                Esta ação será registrada permanentemente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Aviso de ação */}
        <div className={cn('rounded-lg border p-4 mb-2', info.cor)}>
          <p className="font-bold text-sm mb-1">{info.label}</p>
          <p className="text-sm">{info.descricao}</p>
        </div>

        {/* Dados da comanda */}
        <div className="rounded-lg bg-muted/50 border p-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Comanda</span>
            <span className="font-bold">#{String(numeroComanda).padStart(3, '0')}</span>
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
              <span className="font-medium">{formatPrice(valorComanda)}</span>
            </div>
          )}
        </div>

        {/* Campo de motivo */}
        <div className="space-y-2">
          <Label htmlFor="motivo-auditoria" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Motivo <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo-auditoria"
            placeholder="Descreva o motivo com clareza (obrigatório)..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className={cn(
              'resize-none',
              motivo.trim().length > 0 && motivo.trim().length < 5 && 'border-destructive'
            )}
          />
          {motivo.trim().length > 0 && motivo.trim().length < 5 && (
            <p className="text-xs text-destructive">Mínimo de 5 caracteres</p>
          )}
          <p className="text-xs text-muted-foreground">
            Registrado com seu nome, data e horário.
          </p>
        </div>

        {/* Aviso final */}
        <div className="flex items-center gap-2 rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
          <Badge variant="destructive" className="text-xs shrink-0">AUDITORIA</Badge>
          <p className="text-xs text-muted-foreground">
            Toda alteração em comanda fechada fica registrada e não pode ser apagada.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={motivo.trim().length < 5 || loading}
          >
            {loading ? 'Registrando...' : 'Confirmar e Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
