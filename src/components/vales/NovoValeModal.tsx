import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_lancamento: string;
  motivo: string;
  observacoes: string | null;
  forma_desconto: "unico" | "parcelado";
  parcelas_total: number | null;
  parcelas_pagas: number;
  status: string;
}

interface Profissional {
  id: string;
  nome: string;
  funcao: string | null;
  foto_url: string | null;
}

interface NovoValeModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  profissionais: Profissional[];
  editingVale?: Vale | null;
  preSelectedProfissional?: Profissional | null;
}

const parcelasOptions = [2, 3, 4, 6, 8, 10, 12];

const NovoValeModal = ({
  open,
  onClose,
  profissionais,
  editingVale,
  preSelectedProfissional,
}: NovoValeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    profissional_id: "",
    valor: "",
    data_lancamento: format(new Date(), "yyyy-MM-dd"),
    motivo: "",
    forma_desconto: "unico" as "unico" | "parcelado",
    parcelas_total: 2,
    observacoes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (editingVale) {
      setForm({
        profissional_id: editingVale.profissional_id,
        valor: editingVale.valor_total.toString(),
        data_lancamento: editingVale.data_lancamento,
        motivo: editingVale.motivo,
        forma_desconto: editingVale.forma_desconto,
        parcelas_total: editingVale.parcelas_total || 2,
        observacoes: editingVale.observacoes || "",
      });
    } else if (preSelectedProfissional) {
      setForm((prev) => ({
        ...prev,
        profissional_id: preSelectedProfissional.id,
      }));
    } else {
      setForm({
        profissional_id: "",
        valor: "",
        data_lancamento: format(new Date(), "yyyy-MM-dd"),
        motivo: "",
        forma_desconto: "unico",
        parcelas_total: 2,
        observacoes: "",
      });
    }
  }, [editingVale, preSelectedProfissional, open]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const valorNumber = parseFloat(form.valor) || 0;
  const valorParcela = form.forma_desconto === "parcelado" && form.parcelas_total > 0
    ? valorNumber / form.parcelas_total
    : 0;
  const primeiraParcela = addMonths(new Date(form.data_lancamento), 1);

  const handleSubmit = async () => {
    if (!form.profissional_id || !form.valor || !form.motivo) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    if (valorNumber <= 0) {
      toast({ title: "O valor deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (new Date(form.data_lancamento) > new Date()) {
      toast({ title: "A data não pode ser futura", variant: "destructive" });
      return;
    }

    setLoading(true);

    const payload = {
      profissional_id: form.profissional_id,
      valor_total: valorNumber,
      data_lancamento: form.data_lancamento,
      motivo: form.motivo.trim(),
      forma_desconto: form.forma_desconto,
      parcelas_total: form.forma_desconto === "parcelado" ? form.parcelas_total : null,
      observacoes: form.observacoes.trim() || null,
    };

    try {
      if (editingVale) {
        const { error } = await supabase
          .from("vales")
          .update(payload)
          .eq("id", editingVale.id);
        if (error) throw error;
        toast({ title: "Vale atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("vales").insert(payload);
        if (error) throw error;

        const profissional = profissionais.find((p) => p.id === form.profissional_id);
        toast({
          title: "✓ Vale lançado com sucesso!",
          description: `Vale de ${formatCurrency(valorNumber)} lançado para ${profissional?.nome}`,
        });
      }
      onClose(true);
    } catch (error: any) {
      toast({ title: "Erro ao salvar vale", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProfissional = profissionais.find((p) => p.id === form.profissional_id);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {editingVale ? "Editar Vale" : "Lançar Novo Vale"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Profissional Select */}
          {!preSelectedProfissional && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Profissional <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.profissional_id}
                onValueChange={(v) => setForm({ ...form, profissional_id: v })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={prof.foto_url || ""} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(prof.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{prof.nome}</span>
                        {prof.funcao && (
                          <span className="text-muted-foreground text-xs">• {prof.funcao}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {preSelectedProfissional && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <Avatar className="h-10 w-10">
                <AvatarImage src={preSelectedProfissional.foto_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(preSelectedProfissional.nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{preSelectedProfissional.nome}</p>
                <p className="text-sm text-muted-foreground">{preSelectedProfissional.funcao}</p>
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Valor <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="pl-12 h-14 text-2xl font-bold"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Data <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.data_lancamento}
              onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })}
              max={format(new Date(), "yyyy-MM-dd")}
              className="h-11"
            />
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value.slice(0, 500) })}
              placeholder="Ex: Adiantamento, Emergência médica, Despesa pessoal..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.motivo.length}/500</p>
          </div>

          {/* Forma de Desconto */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Forma de Desconto <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={form.forma_desconto}
              onValueChange={(v) => setForm({ ...form, forma_desconto: v as "unico" | "parcelado" })}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="unico" id="unico" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="unico" className="font-medium cursor-pointer">
                    Desconto Único
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Será descontado integralmente na próxima comissão
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <RadioGroupItem value="parcelado" id="parcelado" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="parcelado" className="font-medium cursor-pointer">
                    Parcelado
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Será descontado em parcelas mensais
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Parcelas */}
          {form.forma_desconto === "parcelado" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Número de Parcelas</Label>
              <Select
                value={form.parcelas_total.toString()}
                onValueChange={(v) => setForm({ ...form, parcelas_total: parseInt(v) })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parcelasOptions.map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {valorNumber > 0 && (
                <Card className="border-0" style={{ backgroundColor: "#007AFF10" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5" style={{ color: "#007AFF" }} />
                      <span className="font-medium" style={{ color: "#007AFF" }}>
                        Serão {form.parcelas_total} parcelas de {formatCurrency(valorParcela)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Primeira parcela: {format(primeiraParcela, "MMMM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Observações (opcional)</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value.slice(0, 300) })}
              placeholder="Informações adicionais..."
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.observacoes.length}/300</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose()} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.profissional_id || !form.valor || !form.motivo}
            className="text-white font-semibold min-w-[140px]"
            style={{ backgroundColor: "#34C759" }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : editingVale ? (
              "Salvar Alterações"
            ) : (
              "Lançar Vale"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NovoValeModal;
