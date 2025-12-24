import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Check,
  X,
  Edit,
  Clock,
  User,
  Scissors,
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AgendamentoFormDialog from "@/components/agenda/AgendamentoFormDialog";

interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
}

interface AgendamentoCompleto {
  id: string;
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data_hora: string;
  duracao_minutos: number;
  status: string;
  observacoes: string | null;
  cliente: { nome: string };
  profissional: { nome: string; cor_agenda: string };
  servico: { nome: string; preco: number };
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  agendado: { label: "Agendado", color: "text-amber-600", bgColor: "bg-amber-500/10" },
  confirmado: { label: "Confirmado", color: "text-green-600", bgColor: "bg-green-500/10" },
  atendido: { label: "Atendido", color: "text-blue-600", bgColor: "bg-blue-500/10" },
  cancelado: { label: "Cancelado", color: "text-red-600", bgColor: "bg-red-500/10" },
  faltou: { label: "Faltou", color: "text-gray-600", bgColor: "bg-gray-500/10" },
};

type ViewMode = "dia" | "semana";

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [profissionalFilter, setProfissionalFilter] = useState<string>("todos");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoCompleto | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>();
  const [formInitialTime, setFormInitialTime] = useState<string | undefined>();
  const [formInitialProfissionalId, setFormInitialProfissionalId] = useState<string | undefined>();
  const { toast } = useToast();

  const fetchProfissionais = async () => {
    const { data } = await supabase
      .from("profissionais")
      .select("id, nome, cor_agenda")
      .eq("ativo", true)
      .order("nome");
    if (data) setProfissionais(data);
  };

  const fetchAgendamentos = async () => {
    setLoading(true);
    
    let startDate: Date;
    let endDate: Date;
    
    if (viewMode === "dia") {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      startDate.setHours(0, 0, 0, 0);
      endDate = addDays(startDate, 6);
      endDate.setHours(23, 59, 59, 999);
    }

    let query = supabase
      .from("agendamentos")
      .select(`
        *,
        cliente:clientes(nome),
        profissional:profissionais(nome, cor_agenda),
        servico:servicos(nome, preco)
      `)
      .gte("data_hora", startDate.toISOString())
      .lte("data_hora", endDate.toISOString())
      .order("data_hora");

    if (profissionalFilter !== "todos") {
      query = query.eq("profissional_id", profissionalFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAgendamentos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  useEffect(() => {
    fetchAgendamentos();
  }, [selectedDate, viewMode, profissionalFilter]);

  const goToToday = () => setSelectedDate(new Date());
  const goToPrev = () => setSelectedDate(viewMode === "dia" ? subDays(selectedDate, 1) : subWeeks(selectedDate, 1));
  const goToNext = () => setSelectedDate(viewMode === "dia" ? addDays(selectedDate, 1) : addWeeks(selectedDate, 1));

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const displayedProfissionais = useMemo(() => {
    if (profissionalFilter === "todos") return profissionais;
    return profissionais.filter(p => p.id === profissionalFilter);
  }, [profissionais, profissionalFilter]);

  const getAgendamentosForSlot = (date: Date, time: string, profissionalId: string) => {
    return agendamentos.filter(ag => {
      const agDate = new Date(ag.data_hora);
      const agTime = format(agDate, "HH:mm");
      return (
        isSameDay(agDate, date) &&
        agTime === time &&
        ag.profissional_id === profissionalId
      );
    });
  };

  const getAppointmentStyle = (duracao: number) => {
    const slots = Math.ceil(duracao / 30);
    return { height: `${slots * 40 - 2}px` };
  };

  const handleSlotClick = (date: Date, time: string, profissionalId: string) => {
    setFormInitialDate(date);
    setFormInitialTime(time);
    setFormInitialProfissionalId(profissionalId);
    setSelectedAgendamento(null);
    setIsFormOpen(true);
  };

  const handleAgendamentoClick = (ag: AgendamentoCompleto) => {
    setSelectedAgendamento(ag);
    setFormInitialDate(undefined);
    setFormInitialTime(undefined);
    setFormInitialProfissionalId(undefined);
    setIsFormOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Status atualizado para ${statusConfig[newStatus].label}` });
      fetchAgendamentos();
    }
  };

  const handleDeleteClick = (ag: AgendamentoCompleto) => {
    setSelectedAgendamento(ag);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAgendamento) return;

    const { error } = await supabase
      .from("agendamentos")
      .delete()
      .eq("id", selectedAgendamento.id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Agendamento excluído" });
      fetchAgendamentos();
    }
    setIsDeleteOpen(false);
    setSelectedAgendamento(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedAgendamento(null);
    setFormInitialDate(undefined);
    setFormInitialTime(undefined);
    setFormInitialProfissionalId(undefined);
    if (refresh) fetchAgendamentos();
  };

  const renderCalendarGrid = (dates: Date[]) => (
    <div className="flex-1 overflow-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex sticky top-0 bg-card z-10 border-b">
          <div className="w-16 flex-shrink-0 p-2 border-r bg-muted/50" />
          {dates.map((date) => (
            <div key={date.toISOString()} className="flex-1 min-w-[140px]">
              <div className="text-center py-2 border-r bg-muted/50">
                <p className="text-xs text-muted-foreground capitalize">
                  {format(date, "EEE", { locale: ptBR })}
                </p>
                <p className={cn(
                  "text-lg font-semibold",
                  isSameDay(date, new Date()) && "text-primary"
                )}>
                  {format(date, "dd")}
                </p>
              </div>
              {/* Colunas de profissionais */}
              <div className="flex border-b bg-muted/30">
                {displayedProfissionais.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex-1 min-w-[120px] px-2 py-1 text-center text-xs font-medium border-r truncate"
                    style={{ borderTopColor: prof.cor_agenda, borderTopWidth: 3 }}
                  >
                    {prof.nome}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Coluna de horários */}
          <div className="w-16 flex-shrink-0 border-r">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-10 px-2 flex items-center justify-end text-xs text-muted-foreground border-b"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Dias */}
          {dates.map((date) => (
            <div key={date.toISOString()} className="flex flex-1 min-w-[140px]">
              {displayedProfissionais.map((prof) => (
                <div
                  key={prof.id}
                  className="flex-1 min-w-[120px] border-r relative"
                >
                  {timeSlots.map((time) => {
                    const ags = getAgendamentosForSlot(date, time, prof.id);
                    return (
                      <div
                        key={time}
                        className="h-10 border-b hover:bg-muted/30 cursor-pointer transition-colors relative"
                        onClick={() => ags.length === 0 && handleSlotClick(date, time, prof.id)}
                      >
                        {ags.map((ag) => (
                          <Tooltip key={ag.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 cursor-pointer transition-all hover:shadow-md z-10 overflow-hidden",
                                  "border-l-4"
                                )}
                                style={{
                                  ...getAppointmentStyle(ag.duracao_minutos),
                                  backgroundColor: `${ag.profissional.cor_agenda}20`,
                                  borderLeftColor: ag.profissional.cor_agenda,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAgendamentoClick(ag);
                                }}
                              >
                                <div className="text-xs font-medium truncate">
                                  {ag.cliente.nome}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {ag.servico.nome}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3 space-y-2 max-w-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  <span className="font-semibold">{ag.cliente.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Scissors className="h-3 w-3" />
                                  <span>{ag.servico.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(ag.data_hora), "HH:mm")} - {ag.duracao_minutos}min</span>
                                </div>
                                <Badge className={cn("text-xs", statusConfig[ag.status].bgColor, statusConfig[ag.status].color)}>
                                  {statusConfig[ag.status].label}
                                </Badge>
                              </div>
                              <div className="flex gap-1 pt-2 border-t">
                                {ag.status === "agendado" && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ag.id, "confirmado"); }}>
                                    <Check className="h-3 w-3 mr-1" /> Confirmar
                                  </Button>
                                )}
                                {ag.status === "confirmado" && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ag.id, "atendido"); }}>
                                    <Check className="h-3 w-3 mr-1" /> Atendido
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAgendamentoClick(ag); }}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ag.id, "cancelado"); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">
              {viewMode === "dia" 
                ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : `Semana de ${format(weekDays[0], "dd/MM")} a ${format(weekDays[6], "dd/MM/yyyy")}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos profissionais</SelectItem>
              {profissionais.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prof.cor_agenda }} />
                    {prof.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === "dia" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dia")}
              className="rounded-none"
            >
              Dia
            </Button>
            <Button
              variant={viewMode === "semana" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("semana")}
              className="rounded-none"
            >
              Semana
            </Button>
          </div>

          <Button onClick={() => { setSelectedAgendamento(null); setIsFormOpen(true); }} className="bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendário */}
      <Card className="flex-1 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando agendamentos...
          </div>
        ) : (
          renderCalendarGrid(viewMode === "dia" ? [selectedDate] : weekDays)
        )}
      </Card>

      {/* Dialogs */}
      <AgendamentoFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        agendamento={selectedAgendamento}
        initialDate={formInitialDate}
        initialTime={formInitialTime}
        initialProfissionalId={formInitialProfissionalId}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento?
              Esta ação não pode ser desfeita.
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
};

export default Agenda;
