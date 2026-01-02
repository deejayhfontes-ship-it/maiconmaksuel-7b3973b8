import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  CheckCircle2,
  Edit,
  Flag
} from "lucide-react";
import type { ClienteIncompleto } from "@/hooks/useImportData";

interface ClientesIncompletosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: ClienteIncompleto[];
  onSave: (atualizacoes: Map<string, Partial<ClienteIncompleto>>) => Promise<void>;
  onMarkForUpdate: (clienteIds: string[]) => Promise<void>;
}

export function ClientesIncompletosModal({
  open,
  onOpenChange,
  clientes,
  onSave,
  onMarkForUpdate
}: ClientesIncompletosModalProps) {
  const [edicoes, setEdicoes] = useState<Map<string, Partial<ClienteIncompleto>>>(new Map());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [modo, setModo] = useState<'editar' | 'marcar'>('marcar');

  const handleFieldChange = (clienteId: string, campo: string, valor: string) => {
    setEdicoes(prev => {
      const novas = new Map(prev);
      const clienteEdicao = novas.get(clienteId) || {};
      novas.set(clienteId, { ...clienteEdicao, [campo]: valor });
      return novas;
    });
  };

  const handleToggleSelecionado = (clienteId: string) => {
    setSelecionados(prev => {
      const novos = new Set(prev);
      if (novos.has(clienteId)) {
        novos.delete(clienteId);
      } else {
        novos.add(clienteId);
      }
      return novos;
    });
  };

  const handleSelecionarTodos = () => {
    if (selecionados.size === clientes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(clientes.map(c => c.id)));
    }
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      if (modo === 'editar') {
        await onSave(edicoes);
      } else {
        await onMarkForUpdate(Array.from(selecionados));
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const getCampoIcon = (campo: string) => {
    switch (campo) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'data_nascimento': return <Calendar className="h-3 w-3" />;
      case 'endereco': return <MapPin className="h-3 w-3" />;
      default: return null;
    }
  };

  const getCampoLabel = (campo: string) => {
    switch (campo) {
      case 'email': return 'Email';
      case 'data_nascimento': return 'Data Nasc.';
      case 'endereco': return 'Endereço';
      default: return campo;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {clientes.length} Clientes com Dados Incompletos
          </DialogTitle>
          <DialogDescription>
            Estes clientes foram importados mas possuem campos vazios. 
            Você pode completar agora ou marcar para atualização no próximo atendimento.
          </DialogDescription>
        </DialogHeader>

        {/* Opções de modo */}
        <div className="flex gap-2 py-2">
          <Button
            variant={modo === 'marcar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModo('marcar')}
          >
            <Flag className="h-4 w-4 mr-2" />
            Marcar para Atualização
          </Button>
          <Button
            variant={modo === 'editar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModo('editar')}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar em Lote
          </Button>
        </div>

        {/* Lista de clientes */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3">
            {modo === 'marcar' && (
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selecionados.size === clientes.length}
                  onCheckedChange={handleSelecionarTodos}
                />
                <span className="text-sm text-muted-foreground">
                  Selecionar todos ({selecionados.size}/{clientes.length})
                </span>
              </div>
            )}

            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="border rounded-lg p-3 space-y-2 bg-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {modo === 'marcar' && (
                      <Checkbox
                        checked={selecionados.has(cliente.id)}
                        onCheckedChange={() => handleToggleSelecionado(cliente.id)}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{cliente.nome}</span>
                    </div>
                    {cliente.telefone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {cliente.telefone}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {cliente.camposFaltando.map(campo => (
                      <Badge key={campo} variant="outline" className="text-xs gap-1">
                        {getCampoIcon(campo)}
                        {getCampoLabel(campo)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {modo === 'editar' && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {cliente.camposFaltando.includes('email') && (
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          className="h-8 text-sm"
                          value={edicoes.get(cliente.id)?.email || ''}
                          onChange={(e) => handleFieldChange(cliente.id, 'email', e.target.value)}
                        />
                      </div>
                    )}
                    {cliente.camposFaltando.includes('data_nascimento') && (
                      <div>
                        <Label className="text-xs">Data Nascimento</Label>
                        <Input
                          type="date"
                          className="h-8 text-sm"
                          value={edicoes.get(cliente.id)?.data_nascimento || ''}
                          onChange={(e) => handleFieldChange(cliente.id, 'data_nascimento', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fazer Depois
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving ? (
              'Salvando...'
            ) : modo === 'marcar' ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar {selecionados.size} para Atualização
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
