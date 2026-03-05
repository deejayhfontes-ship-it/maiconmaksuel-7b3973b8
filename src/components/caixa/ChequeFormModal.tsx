import { useState, useEffect } from "react";
import { FileText, X, Calendar, User, Building2, Hash, DollarSign, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ChequeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cheque?: Cheque | null;
  atendimentoId?: string;
  clienteId?: string;
  caixaId?: string;
  valorSugerido?: number;
}

interface Cheque {
  id: string;
  numero_cheque: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  emitente: string;
  cpf_cnpj_emitente: string | null;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_compensacao: string | null;
  data_devolucao: string | null;
  motivo_devolucao: string | null;
  status: string;
  observacoes: string | null;
}

const BANCOS = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "077", nome: "Inter" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "000", nome: "Outro" },
];

export function ChequeFormModal({
  open,
  onOpenChange,
  onSuccess,
  cheque,
  atendimentoId,
  clienteId,
  caixaId,
  valorSugerido,
}: ChequeFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [numeroCheque, setNumeroCheque] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [emitente, setEmitente] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataVencimento, setDataVencimento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState("pendente");

  useEffect(() => {
    if (cheque) {
      setNumeroCheque(cheque.numero_cheque);
      setBanco(cheque.banco || "");
      setAgencia(cheque.agencia || "");
      setConta(cheque.conta || "");
      setEmitente(cheque.emitente);
      setCpfCnpj(cheque.cpf_cnpj_emitente || "");
      setValor(cheque.valor.toString());
      setDataEmissao(cheque.data_emissao);
      setDataVencimento(cheque.data_vencimento);
      setObservacoes(cheque.observacoes || "");
      setStatus(cheque.status);
    } else {
      resetForm();
      if (valorSugerido) {
        setValor(valorSugerido.toString());
      }
    }
  }, [cheque, valorSugerido, open]);

  const resetForm = () => {
    setNumeroCheque("");
    setBanco("");
    setAgencia("");
    setConta("");
    setEmitente("");
    setCpfCnpj("");
    setValor("");
    setDataEmissao(format(new Date(), "yyyy-MM-dd"));
    setDataVencimento(format(new Date(), "yyyy-MM-dd"));
    setObservacoes("");
    setStatus("pendente");
  };

  const handleSubmit = async () => {
    if (!numeroCheque.trim()) {
      toast({ title: "Informe o número do cheque", variant: "destructive" });
      return;
    }
    if (!emitente.trim()) {
      toast({ title: "Informe o emitente", variant: "destructive" });
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    if (!dataVencimento) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }

    setLoading(true);

    const chequeData = {
      numero_cheque: numeroCheque.trim(),
      banco: banco || null,
      agencia: agencia || null,
      conta: conta || null,
      emitente: emitente.trim(),
      cpf_cnpj_emitente: cpfCnpj || null,
      valor: parseFloat(valor),
      data_emissao: dataEmissao,
      data_vencimento: dataVencimento,
      observacoes: observacoes || null,
      status,
      atendimento_id: atendimentoId || null,
      cliente_id: clienteId || null,
      caixa_id: caixaId || null,
    };

    let error;
    if (cheque) {
      const result = await supabase
        .from("cheques")
        .update(chequeData)
        .eq("id", cheque.id);
      error = result.error;
    } else {
      const result = await supabase.from("cheques").insert(chequeData);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao salvar cheque", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: cheque ? "Cheque atualizado!" : "Cheque cadastrado!" });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {cheque ? "Editar Cheque" : "Novo Cheque"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Número e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="h-4 w-4" /> Nº do Cheque *
              </Label>
              <Input
                value={numeroCheque}
                onChange={(e) => setNumeroCheque(e.target.value)}
                placeholder="000000"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Valor *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Banco */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Building2 className="h-4 w-4" /> Banco
            </Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => (
                  <SelectItem key={b.codigo} value={b.nome}>
                    {b.codigo} - {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agência e Conta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                placeholder="0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder="00000-0"
              />
            </div>
          </div>

          {/* Emitente */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="h-4 w-4" /> Emitente *
            </Label>
            <Input
              value={emitente}
              onChange={(e) => setEmitente(e.target.value)}
              placeholder="Nome do emitente"
            />
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-2">
            <Label>CPF/CNPJ do Emitente</Label>
            <Input
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Data Emissão
              </Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Vencimento *
              </Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>

          {/* Status (apenas em edição) */}
          {cheque && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="compensado">Compensado</SelectItem>
                  <SelectItem value="devolvido">Devolvido</SelectItem>
                  <SelectItem value="reapresentado">Reapresentado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}