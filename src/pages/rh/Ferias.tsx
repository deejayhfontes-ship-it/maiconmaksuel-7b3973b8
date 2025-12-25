import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, addDays, addYears, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, Sun, AlertTriangle, Check, Clock, Printer, Plus
} from "lucide-react";

export default function Ferias() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    dias_ferias: 30,
    data_inicio: "",
    abono_pecuniario: false,
    dias_abono: 10,
    observacoes: "",
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("ativo", true)
        .is("data_demissao", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ["ferias-funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias_funcionarios")
        .select("*, funcionario:funcionarios(*)")
        .order("data_inicio_ferias", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const calcularPeriodoAquisitivo = (dataAdmissao: string) => {
    const admissao = new Date(dataAdmissao);
    const hoje = new Date();
    const anosCompletos = Math.floor(differenceInDays(hoje, admissao) / 365);
    
    const inicioAtual = addYears(admissao, anosCompletos);
    const fimAtual = addDays(addYears(admissao, anosCompletos + 1), -1);
    
    return {
      inicio: inicioAtual,
      fim: fimAtual,
      diasRestantes: differenceInDays(fimAtual, hoje),
    };
  };

  const calcularValorFerias = (salario: number, dias: number, abono: boolean, diasAbono: number) => {
    const valorDia = salario / 30;
    const diasEfetivos = abono ? dias - diasAbono : dias;
    const valorFerias = valorDia * diasEfetivos;
    const tercoConstitucional = valorFerias / 3;
    const valorAbono = abono ? (valorDia * diasAbono) + (valorDia * diasAbono / 3) : 0;
    
    return {
      valorFerias,
      tercoConstitucional,
      valorAbono,
      total: valorFerias + tercoConstitucional + valorAbono,
    };
  };

  const handleOpenDialog = (funcionario: any) => {
    setSelectedFuncionario(funcionario);
    setForm({
      dias_ferias: 30,
      data_inicio: "",
      abono_pecuniario: false,
      dias_abono: 10,
      observacoes: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedFuncionario || !form.data_inicio) {
      toast.error("Selecione a data de início das férias");
      return;
    }

    setSaving(true);
    try {
      const periodo = calcularPeriodoAquisitivo(selectedFuncionario.data_admissao);
      const diasEfetivos = form.abono_pecuniario ? form.dias_ferias - form.dias_abono : form.dias_ferias;
      const dataFim = addDays(new Date(form.data_inicio), diasEfetivos - 1);
      
      const valores = calcularValorFerias(
        Number(selectedFuncionario.salario_base),
        form.dias_ferias,
        form.abono_pecuniario,
        form.dias_abono
      );

      const { error } = await supabase.from("ferias_funcionarios").insert({
        funcionario_id: selectedFuncionario.id,
        periodo_aquisitivo_inicio: format(periodo.inicio, "yyyy-MM-dd"),
        periodo_aquisitivo_fim: format(periodo.fim, "yyyy-MM-dd"),
        dias_direito: 30,
        dias_gozados: diasEfetivos,
        data_inicio_ferias: form.data_inicio,
        data_fim_ferias: format(dataFim, "yyyy-MM-dd"),
        valor_ferias: valores.valorFerias,
        terco_constitucional: valores.tercoConstitucional,
        abono_pecuniario: form.abono_pecuniario,
        dias_abono: form.abono_pecuniario ? form.dias_abono : 0,
        status: "programadas",
        observacoes: form.observacoes,
      });

      if (error) throw error;
      
      toast.success("Férias programadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ferias-funcionarios"] });
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao programar férias");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "programadas":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">📅 Programadas</Badge>;
      case "em_gozo":
        return <Badge className="bg-green-500">🏖️ Em Gozo</Badge>;
      case "concluidas":
        return <Badge variant="secondary">✓ Concluídas</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats
  const feriasProximas = funcionarios.filter(f => {
    const periodo = calcularPeriodoAquisitivo(f.data_admissao);
    return periodo.diasRestantes <= 60 && periodo.diasRestantes > 0;
  });

  const feriasVencidas = funcionarios.filter(f => {
    const periodo = calcularPeriodoAquisitivo(f.data_admissao);
    return periodo.diasRestantes <= 0;
  });

  // Calculate form values
  const valores = selectedFuncionario ? calcularValorFerias(
    Number(selectedFuncionario.salario_base),
    form.dias_ferias,
    form.abono_pecuniario,
    form.dias_abono
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Férias</h1>
          <p className="text-muted-foreground">Controle períodos aquisitivos e férias dos funcionários</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{feriasProximas.length}</p>
                <p className="text-xs text-muted-foreground">Vencendo em 60 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{feriasVencidas.length}</p>
                <p className="text-xs text-muted-foreground">Férias Vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sun className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ferias.filter(f => f.status === "programadas").length}</p>
                <p className="text-xs text-muted-foreground">Férias Programadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista por Funcionário */}
      <div className="grid gap-4">
        {funcionarios.map((funcionario) => {
          const periodo = calcularPeriodoAquisitivo(funcionario.data_admissao);
          const feriasFunc = ferias.filter(f => f.funcionario_id === funcionario.id);
          const ultimasFerias = feriasFunc[0];
          
          let statusColor = "text-green-500";
          let statusText = "Em dia";
          
          if (periodo.diasRestantes <= 0) {
            statusColor = "text-red-500";
            statusText = "⚠️ Vencidas";
          } else if (periodo.diasRestantes <= 60) {
            statusColor = "text-yellow-500";
            statusText = `Vence em ${periodo.diasRestantes} dias`;
          }

          return (
            <Card key={funcionario.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={funcionario.foto_url || undefined} />
                      <AvatarFallback>{funcionario.nome?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{funcionario.nome}</h3>
                      <p className="text-sm text-muted-foreground">{funcionario.cargo}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleOpenDialog(funcionario)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Programar Férias
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Período Aquisitivo</p>
                    <p className="font-medium">
                      {format(periodo.inicio, "dd/MM/yyyy")} - {format(periodo.fim, "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Direito / Gozados</p>
                    <p className="font-medium">30 dias / 0 dias</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className={`font-medium ${statusColor}`}>{statusText}</p>
                  </div>
                </div>

                {ultimasFerias && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Última programação:</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ultimasFerias.status)}
                      <span className="text-sm">
                        {format(new Date(ultimasFerias.data_inicio_ferias), "dd/MM/yyyy")} - 
                        {format(new Date(ultimasFerias.data_fim_ferias), "dd/MM/yyyy")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({ultimasFerias.dias_gozados} dias)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog Programar Férias */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Programar Férias</DialogTitle>
          </DialogHeader>
          {selectedFuncionario && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarFallback>{selectedFuncionario.nome?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedFuncionario.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Salário: {formatCurrency(selectedFuncionario.salario_base)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dias de Férias</Label>
                  <Select 
                    value={String(form.dias_ferias)} 
                    onValueChange={(v) => setForm({ ...form, dias_ferias: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="20">20 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="10">10 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>
              </div>

              {form.data_inicio && (
                <div className="text-sm text-muted-foreground">
                  Data fim: {format(addDays(new Date(form.data_inicio), (form.abono_pecuniario ? form.dias_ferias - form.dias_abono : form.dias_ferias) - 1), "dd/MM/yyyy")}
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Abono Pecuniário</Label>
                  <p className="text-xs text-muted-foreground">Vender {form.dias_abono} dias de férias</p>
                </div>
                <Switch
                  checked={form.abono_pecuniario}
                  onCheckedChange={(v) => setForm({ ...form, abono_pecuniario: v })}
                />
              </div>

              {valores && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium mb-3">Cálculos:</h4>
                  <div className="flex justify-between text-sm">
                    <span>Férias ({form.abono_pecuniario ? form.dias_ferias - form.dias_abono : form.dias_ferias} dias):</span>
                    <span>{formatCurrency(valores.valorFerias)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>+ 1/3 Constitucional:</span>
                    <span>{formatCurrency(valores.tercoConstitucional)}</span>
                  </div>
                  {form.abono_pecuniario && (
                    <div className="flex justify-between text-sm">
                      <span>+ Abono ({form.dias_abono} dias):</span>
                      <span>{formatCurrency(valores.valorAbono)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                    <span>TOTAL A RECEBER:</span>
                    <span className="text-green-600">{formatCurrency(valores.total)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Programar Férias"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
