import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, Calendar, Check, X, AlertTriangle, ChevronLeft, ChevronRight,
  Save, FileText, Upload, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Ponto() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pontoEdit, setPontoEdit] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

  const { data: pontos = [] } = useQuery({
    queryKey: ["pontos", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const { data, error } = await supabase
        .from("ponto_funcionarios")
        .select("*, funcionario:funcionarios(*)")
        .gte("data", format(start, "yyyy-MM-dd"))
        .lte("data", format(end, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
  });

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getPontoByDiaFuncionario = (dia: Date, funcionarioId: string) => {
    return pontos.find(
      (p) => isSameDay(parseISO(p.data), dia) && p.funcionario_id === funcionarioId
    );
  };

  const getPontosHoje = () => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    return funcionarios.map((f) => {
      const ponto = pontos.find((p) => p.data === hoje && p.funcionario_id === f.id);
      return { funcionario: f, ponto };
    });
  };

  const handleOpenRegistro = (funcionario: any, ponto?: any) => {
    setPontoEdit({
      funcionario,
      funcionario_id: funcionario.id,
      data: format(new Date(), "yyyy-MM-dd"),
      entrada_manha: ponto?.entrada_manha || funcionario.jornada_entrada || "08:00",
      saida_almoco: ponto?.saida_almoco || funcionario.jornada_saida_almoco || "12:00",
      entrada_tarde: ponto?.entrada_tarde || funcionario.jornada_entrada_tarde || "13:00",
      saida: ponto?.saida || "",
      falta: ponto?.falta || false,
      justificada: ponto?.justificada || false,
      justificativa: ponto?.justificativa || "",
      observacoes: ponto?.observacoes || "",
      id: ponto?.id,
    });
    setDialogOpen(true);
  };

  const calcularHoras = (entrada: string, saida_almoco: string, entrada_tarde: string, saida: string) => {
    if (!entrada || !saida) return { trabalhadas: 0, extras: 0 };
    
    const [eh, em] = entrada.split(":").map(Number);
    const [sah, sam] = saida_almoco.split(":").map(Number);
    const [eth, etm] = entrada_tarde.split(":").map(Number);
    const [sh, sm] = saida.split(":").map(Number);
    
    const manha = (sah * 60 + sam) - (eh * 60 + em);
    const tarde = (sh * 60 + sm) - (eth * 60 + etm);
    const total = (manha + tarde) / 60;
    
    return {
      trabalhadas: Math.max(0, total),
      extras: Math.max(0, total - 8),
    };
  };

  const handleSavePonto = async () => {
    if (!pontoEdit) return;
    setSaving(true);
    try {
      const { trabalhadas, extras } = calcularHoras(
        pontoEdit.entrada_manha,
        pontoEdit.saida_almoco,
        pontoEdit.entrada_tarde,
        pontoEdit.saida
      );

      const data = {
        funcionario_id: pontoEdit.funcionario_id,
        data: pontoEdit.data,
        entrada_manha: pontoEdit.falta ? null : pontoEdit.entrada_manha,
        saida_almoco: pontoEdit.falta ? null : pontoEdit.saida_almoco,
        entrada_tarde: pontoEdit.falta ? null : pontoEdit.entrada_tarde,
        saida: pontoEdit.falta ? null : pontoEdit.saida || null,
        horas_trabalhadas: pontoEdit.falta ? 0 : trabalhadas,
        horas_extras: pontoEdit.falta ? 0 : extras,
        falta: pontoEdit.falta,
        justificada: pontoEdit.falta ? pontoEdit.justificada : false,
        justificativa: pontoEdit.falta ? pontoEdit.justificativa : null,
        observacoes: pontoEdit.observacoes || null,
      };

      if (pontoEdit.id) {
        const { error } = await supabase
          .from("ponto_funcionarios")
          .update(data)
          .eq("id", pontoEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ponto_funcionarios").insert(data);
        if (error) throw error;
      }

      toast.success("Ponto registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pontos"] });
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      if (error.code === "23505") {
        toast.error("Já existe um registro de ponto para este dia");
      } else {
        toast.error("Erro ao salvar ponto");
      }
    } finally {
      setSaving(false);
    }
  };

  const pontosHoje = getPontosHoje();
  const presentes = pontosHoje.filter((p) => p.ponto && !p.ponto.falta).length;
  const ausentes = pontosHoje.filter((p) => !p.ponto || p.ponto.falta).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/gestao-rh">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Controle de Ponto</h1>
            <p className="text-muted-foreground">Registre a entrada e saída dos funcionários</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentes}</p>
                <p className="text-xs text-muted-foreground">Presentes Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ausentes}</p>
                <p className="text-xs text-muted-foreground">Ausentes Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList>
          <TabsTrigger value="hoje">
            <Clock className="h-4 w-4 mr-2" />
            Hoje
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <Calendar className="h-4 w-4 mr-2" />
            Calendário Mensal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4 space-y-4">
          <div className="text-lg font-medium">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>

          <div className="grid gap-4">
            {pontosHoje.map(({ funcionario, ponto }) => (
              <Card key={funcionario.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={funcionario.foto_url || undefined} />
                        <AvatarFallback>{funcionario.nome?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{funcionario.nome}</h3>
                        <p className="text-sm text-muted-foreground">{funcionario.cargo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {ponto ? (
                        ponto.falta ? (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            {ponto.justificada ? "Falta Justificada" : "Ausente"}
                          </Badge>
                        ) : (
                          <div className="text-right">
                            <Badge variant="default" className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Presente
                            </Badge>
                            <p className="text-sm mt-1">
                              Entrada: {ponto.entrada_manha} | Almoço: {ponto.saida_almoco}-{ponto.entrada_tarde}
                              {ponto.saida && ` | Saída: ${ponto.saida}`}
                            </p>
                            {ponto.horas_trabalhadas > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Trabalhadas: {ponto.horas_trabalhadas?.toFixed(1)}h
                                {ponto.horas_extras > 0 && ` (${ponto.horas_extras?.toFixed(1)}h extras)`}
                              </p>
                            )}
                          </div>
                        )
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sem registro
                        </Badge>
                      )}

                      <div className="flex gap-2">
                        {(!ponto || !ponto.saida) && !ponto?.falta && (
                          <Button size="sm" onClick={() => handleOpenRegistro(funcionario, ponto)}>
                            {ponto ? "Registrar Saída" : "Registrar Entrada"}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenRegistro(funcionario, ponto)}
                        >
                          {ponto?.falta ? "Editar" : "Justificar Falta"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Funcionários</SelectItem>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-green-500">Presente</Badge>
                <Badge variant="destructive">Falta</Badge>
                <Badge className="bg-yellow-500">Justificada</Badge>
                <Badge variant="secondary">Sem registro</Badge>
              </div>

              {selectedFuncionario === "todos" ? (
                <div className="space-y-4">
                  {funcionarios.map((funcionario) => (
                    <div key={funcionario.id} className="space-y-2">
                      <h4 className="font-medium">{funcionario.nome}</h4>
                      <div className="grid grid-cols-7 gap-1">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                          <div key={d} className="text-center text-xs font-medium text-muted-foreground p-1">
                            {d}
                          </div>
                        ))}
                        {Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay())
                          .fill(null)
                          .map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                        {diasDoMes.map((dia) => {
                          const ponto = getPontoByDiaFuncionario(dia, funcionario.id);
                          let bgColor = "bg-muted/30";
                          if (ponto) {
                            if (ponto.falta) {
                              bgColor = ponto.justificada ? "bg-yellow-500/20" : "bg-red-500/20";
                            } else {
                              bgColor = "bg-green-500/20";
                            }
                          }
                          return (
                            <div
                              key={dia.toISOString()}
                              className={`p-2 text-center text-sm rounded ${bgColor} ${
                                isToday(dia) ? "ring-2 ring-primary" : ""
                              }`}
                            >
                              {format(dia, "d")}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {d}
                    </div>
                  ))}
                  {Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay())
                    .fill(null)
                    .map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                  {diasDoMes.map((dia) => {
                    const ponto = getPontoByDiaFuncionario(dia, selectedFuncionario);
                    let bgColor = "bg-muted/30 hover:bg-muted/50";
                    if (ponto) {
                      if (ponto.falta) {
                        bgColor = ponto.justificada ? "bg-yellow-500/30 hover:bg-yellow-500/40" : "bg-red-500/30 hover:bg-red-500/40";
                      } else {
                        bgColor = "bg-green-500/30 hover:bg-green-500/40";
                      }
                    }
                    return (
                      <button
                        key={dia.toISOString()}
                        className={`p-3 text-center rounded cursor-pointer transition-colors ${bgColor} ${
                          isToday(dia) ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => {
                          const func = funcionarios.find((f) => f.id === selectedFuncionario);
                          if (func) {
                            setPontoEdit({
                              funcionario: func,
                              funcionario_id: func.id,
                              data: format(dia, "yyyy-MM-dd"),
                              entrada_manha: ponto?.entrada_manha || func.jornada_entrada || "08:00",
                              saida_almoco: ponto?.saida_almoco || func.jornada_saida_almoco || "12:00",
                              entrada_tarde: ponto?.entrada_tarde || func.jornada_entrada_tarde || "13:00",
                              saida: ponto?.saida || "",
                              falta: ponto?.falta || false,
                              justificada: ponto?.justificada || false,
                              justificativa: ponto?.justificativa || "",
                              observacoes: ponto?.observacoes || "",
                              id: ponto?.id,
                            });
                            setDialogOpen(true);
                          }
                        }}
                      >
                        <div className="font-medium">{format(dia, "d")}</div>
                        {ponto && !ponto.falta && ponto.horas_trabalhadas > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {ponto.horas_trabalhadas?.toFixed(1)}h
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Registro de Ponto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ponto</DialogTitle>
          </DialogHeader>
          {pontoEdit && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarFallback>{pontoEdit.funcionario?.nome?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{pontoEdit.funcionario?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(pontoEdit.data), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  <Label>Marcar falta</Label>
                </div>
                <Switch
                  checked={pontoEdit.falta}
                  onCheckedChange={(v) => setPontoEdit({ ...pontoEdit, falta: v })}
                />
              </div>

              {pontoEdit.falta ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Falta justificada</Label>
                    <Switch
                      checked={pontoEdit.justificada}
                      onCheckedChange={(v) => setPontoEdit({ ...pontoEdit, justificada: v })}
                    />
                  </div>
                  {pontoEdit.justificada && (
                    <>
                      <div>
                        <Label>Justificativa</Label>
                        <Textarea
                          value={pontoEdit.justificativa}
                          onChange={(e) => setPontoEdit({ ...pontoEdit, justificativa: e.target.value })}
                          placeholder="Motivo da falta..."
                        />
                      </div>
                      <div>
                        <Label>Atestado (opcional)</Label>
                        <div className="mt-2">
                          <Button variant="outline" className="w-full">
                            <Upload className="h-4 w-4 mr-2" />
                            Anexar Atestado
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Entrada Manhã</Label>
                    <Input
                      type="time"
                      value={pontoEdit.entrada_manha}
                      onChange={(e) => setPontoEdit({ ...pontoEdit, entrada_manha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Saída Almoço</Label>
                    <Input
                      type="time"
                      value={pontoEdit.saida_almoco}
                      onChange={(e) => setPontoEdit({ ...pontoEdit, saida_almoco: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Entrada Tarde</Label>
                    <Input
                      type="time"
                      value={pontoEdit.entrada_tarde}
                      onChange={(e) => setPontoEdit({ ...pontoEdit, entrada_tarde: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Saída</Label>
                    <Input
                      type="time"
                      value={pontoEdit.saida}
                      onChange={(e) => setPontoEdit({ ...pontoEdit, saida: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={pontoEdit.observacoes}
                  onChange={(e) => setPontoEdit({ ...pontoEdit, observacoes: e.target.value })}
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePonto} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Ponto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
