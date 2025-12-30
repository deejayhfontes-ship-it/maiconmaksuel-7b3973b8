import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_lancamento: string;
  motivo: string;
  forma_desconto: "unico" | "parcelado";
  parcelas_total: number | null;
  parcelas_pagas: number;
  status: string;
  profissional?: {
    nome: string;
  };
}

interface QuitarValeModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  vale: Vale | null;
}

const QuitarValeModal = ({ open, onClose, vale }: QuitarValeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    forma_quitacao: "comissao" as "comissao" | "dinheiro" | "cancelamento" | "outro",
    data_pagamento: format(new Date(), "yyyy-MM-dd"),
    forma_pagamento: "dinheiro",
    observacoes: "",
  });
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleConfirm = () => {
    setConfirmOpen(true);
  };

  const handleQuitar = async () => {
    if (!vale) return;

    setLoading(true);
    setConfirmOpen(false);

    try {
      const updateData: any = {
        status: form.forma_quitacao === "cancelamento" ? "cancelado" : "quitado",
        data_quitacao: form.data_pagamento,
        quitado_por: form.forma_quitacao,
        valor_pago: vale.valor_total,
        parcelas_pagas: vale.parcelas_total || 1,
      };

      const { error } = await supabase
        .from("vales")
        .update(updateData)
        .eq("id", vale.id);

      if (error) throw error;

      toast({
        title: "✓ Vale quitado com sucesso!",
        description: `O vale de ${formatCurrency(vale.valor_total)} foi quitado.`,
      });

      onClose(true);
    } catch (error: any) {
      toast({ title: "Erro ao quitar vale", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!vale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#34C75920" }}
              >
                <CheckCircle className="h-6 w-6" style={{ color: "#34C759" }} />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-bold">Quitar Vale</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Resumo do Vale */}
            <Card className="bg-muted/50 border-0">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">{vale.profissional?.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor original:</span>
                  <span className="font-medium">{formatCurrency(vale.valor_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Já pago:</span>
                  <span className="font-medium">
                    {formatCurrency(vale.valor_pago)}
                    {vale.forma_desconto === "parcelado" && ` (${vale.parcelas_pagas} parc.)`}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-medium">Saldo restante:</span>
                  <span className="font-bold text-lg" style={{ color: "#FF3B30" }}>
                    {formatCurrency(vale.saldo_restante)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Forma de Quitação */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Forma de Quitação</Label>
              <RadioGroup
                value={form.forma_quitacao}
                onValueChange={(v) => setForm({ ...form, forma_quitacao: v as any })}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="comissao" id="comissao" />
                  <Label htmlFor="comissao" className="flex-1 cursor-pointer">
                    <span className="font-medium">Desconto em comissão</span>
                    <span className="text-xs text-muted-foreground ml-2">(recomendado)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro" className="flex-1 cursor-pointer font-medium">
                    Pagamento em dinheiro
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="cancelamento" id="cancelamento" />
                  <Label htmlFor="cancelamento" className="flex-1 cursor-pointer font-medium">
                    Cancelamento do vale
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="outro" id="outro" />
                  <Label htmlFor="outro" className="flex-1 cursor-pointer font-medium">
                    Outro
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Campos condicionais para pagamento em dinheiro */}
            {form.forma_quitacao === "dinheiro" && (
              <div className="space-y-4 p-4 border rounded-xl bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data do pagamento</Label>
                  <Input
                    type="date"
                    value={form.data_pagamento}
                    onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Forma</Label>
                  <Select
                    value={form.forma_pagamento}
                    onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações da quitação</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Detalhes da quitação..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Aviso */}
            <Card className="border-0" style={{ backgroundColor: "#FFCC0015" }}>
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#FFCC00" }} />
                <p className="text-sm">
                  Esta ação não pode ser desfeita. O vale será marcado como{" "}
                  {form.forma_quitacao === "cancelamento" ? "cancelado" : "quitado"}.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onClose()} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="text-white font-semibold min-w-[160px]"
              style={{ backgroundColor: "#34C759" }}
            >
              Confirmar Quitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação extra */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a{" "}
              {form.forma_quitacao === "cancelamento" ? "cancelar" : "quitar"} o vale de{" "}
              <strong>{formatCurrency(vale.valor_total)}</strong> para{" "}
              <strong>{vale.profissional?.nome}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuitar}
              disabled={loading}
              className="text-white"
              style={{ backgroundColor: "#34C759" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default QuitarValeModal;
