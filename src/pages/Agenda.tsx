import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Check,
  X,
  Edit,
  Clock,
  User,
  Scissors,
  Phone,
  Cake,
  RefreshCw,
  Printer,
  CalendarDays,
  ChevronFirst,
  ChevronLast,
  UserCheck,
  Zap,
} from "lucide-react";
import { format, addDays, subDays, isSameDay, parseISO, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AgendamentoFormDialog from "@/components/agenda/AgendamentoFormDialog";

interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
  ativo: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  celular: string;
  telefone: string | null;
  data_nascimento: string | null;
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
  cliente: Cliente;
  profissional: { nome: string; cor_agenda: string };
  servico: { nome: string; preco: number };
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

// iOS Official Colors for Status
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  agendado: { label: "Agendado", color: "text-warning", bgColor: "bg-warning/15", icon: <Clock className="h-3 w-3" /> },
  confirmado: { label: "Confirmado", color: "text-success", bgColor: "bg-success/15", icon: <Check className="h-3 w-3" /> },
  atendido: { label: "Atendido", color: "text-primary", bgColor: "bg-primary/15", icon: <UserCheck className="h-3 w-3" /> },
  cancelado: { label: "Cancelado", color: "text-destructive", bgColor: "bg-destructive/15", icon: <X className="h-3 w-3" /> },
  faltou: { label: "Faltou", color: "text-muted-foreground", bgColor: "bg-muted", icon: <User className="h-3 w-3" /> },
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
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
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfissionais = async () => {
    const { data } = await supabase
      .from("profissionais")
      .select("id, nome, cor_agenda, ativo")
      .eq("ativo", true)
      .order("nome");
    if (data) setProfissionais(data);
  };

  const fetchAgendamentos = async () => {
    setLoading(true);
    
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("agendamentos")
      .select(`
        *,
        cliente:clientes(id, nome, celular, telefone, data_nascimento),
        profissional:profissionais(nome, cor_agenda),
        servico:servicos(nome, preco)
      `)
      .gte("data_hora", startDate.toISOString())
      .lte("data_hora", endDate.toISOString())
      .order("data_hora");

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
  }, [selectedDate]);

  const displayedProfissionais = useMemo(() => {
    if (profissionalFilter === "todos") return profissionais;
    return profissionais.filter(p => p.id === profissionalFilter);
  }, [profissionais, profissionalFilter]);

  // Estatísticas do dia
  const stats = useMemo(() => {
    const total = agendamentos.length;
    const confirmados = agendamentos.filter(a => a.status === "confirmado").length;
    const atendidos = agendamentos.filter(a => a.status === "atendido").length;
    const cancelados = agendamentos.filter(a => a.status === "cancelado").length;
    const vagasTotal = displayedProfissionais.length * timeSlots.length;
    const ocupadas = agendamentos.filter(a => a.status !== "cancelado" && a.status !== "faltou").length;
    const taxaOcupacao = vagasTotal > 0 ? Math.round((ocupadas / vagasTotal) * 100) : 0;
    
    return { total, confirmados, atendidos, cancelados, vagasLivres: vagasTotal - ocupadas, taxaOcupacao };
  }, [agendamentos, displayedProfissionais]);

  // Navegação
  const goToToday = () => {
    setSelectedDate(new Date());
    setCalendarMonth(new Date());
  };
  const goToPrev = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNext = () => setSelectedDate(addDays(selectedDate, 1));
  const goToFirst = () => setSelectedDate(startOfMonth(selectedDate));
  const goToLast = () => setSelectedDate(endOfMonth(selectedDate));

  // Handlers
  const handleSlotClick = (time: string, profissionalId: string) => {
    setFormInitialDate(selectedDate);
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
    setOpenPopoverId(null);
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
    setOpenPopoverId(null);
  };

  const handleDeleteClick = (ag: AgendamentoCompleto) => {
    setSelectedAgendamento(ag);
    setIsDeleteOpen(true);
    setOpenPopoverId(null);
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

  // Verificar aniversário
  const isBirthday = (cliente: Cliente) => {
    if (!cliente.data_nascimento) return false;
    const today = new Date();
    const birth = parseISO(cliente.data_nascimento);
    return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth();
  };

  // Obter agendamentos para um slot específico
  const getAgendamentosForSlot = (time: string, profissionalId: string) => {
    return agendamentos.filter(ag => {
      const agTime = format(new Date(ag.data_hora), "HH:mm");
      return agTime === time && ag.profissional_id === profissionalId;
    });
  };

  // Calcular horário de término
  const getEndTime = (startTime: string, duracao: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duracao;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  // Calcular slots ocupados para cada agendamento
  const getSlotsForAgendamento = (duracao: number) => Math.ceil(duracao / 30);

  // Verificar se slot está ocupado por agendamento anterior
  const isSlotOccupied = (time: string, profissionalId: string) => {
    const [slotH, slotM] = time.split(":").map(Number);
    const slotMinutes = slotH * 60 + slotM;
    
    return agendamentos.some(ag => {
      if (ag.profissional_id !== profissionalId) return false;
      const agTime = format(new Date(ag.data_hora), "HH:mm");
      const [agH, agM] = agTime.split(":").map(Number);
      const agStartMinutes = agH * 60 + agM;
      const agEndMinutes = agStartMinutes + ag.duracao_minutos;
      
      return slotMinutes > agStartMinutes && slotMinutes < agEndMinutes;
    });
  };

  // Dia da semana atual
  const currentDayIndex = selectedDate.getDay();
  const adjustedDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-4 overflow-hidden">
      {/* Coluna Esquerda - Mini Calendário */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 overflow-auto">
        {/* Mini calendário - Hidden on mobile */}
        <Card className="p-2 hidden lg:block">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={ptBR}
            className="pointer-events-auto"
            classNames={{
              months: "flex flex-col",
              month: "space-y-2",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
              row: "flex w-full mt-1",
              cell: "relative h-8 w-8 text-center text-sm p-0 focus-within:relative focus-within:z-20",
              day: cn(
                "h-8 w-8 p-0 font-normal hover:bg-accent rounded-md transition-colors inline-flex items-center justify-center"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-bold",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
          />
        </Card>

        {/* Legenda - Hidden on mobile */}
        <Card className="p-4 space-y-2 hidden lg:block">
          <h3 className="text-sm font-medium">Legenda</h3>
          <div className="space-y-1.5">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div className={cn("flex items-center justify-center w-5 h-5 rounded", config.bgColor, config.color)}>
                  {config.icon}
                </div>
                <span>{config.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Botões Agendar e Encaixe - Abaixo da legenda */}
        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1 gap-2 lg:h-14 lg:text-lg"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Agendar
          </Button>
          <Button
            size="lg"
            className="flex-1 gap-2 lg:h-14 lg:text-lg bg-warning hover:bg-warning/90 text-warning-foreground shadow-[0_4px_14px_rgba(255,149,0,0.35)]"
            onClick={() => {
              setFormInitialDate(selectedDate);
              setFormInitialTime(undefined);
              setFormInitialProfissionalId(undefined);
              setSelectedAgendamento(null);
              setIsFormOpen(true);
            }}
          >
            <Zap className="h-5 w-5" />
            Encaixe
          </Button>
        </div>
      </div>

      {/* Coluna Direita - Grid de Agendamentos */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header com navegação - Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 sm:gap-2 justify-center sm:justify-start flex-wrap">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToFirst}>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToLast}>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-base sm:text-xl font-bold capitalize text-center sm:text-left order-first sm:order-none">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>

          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={fetchAgendamentos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Abas de dias da semana */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {weekDays.map((day, idx) => (
            <Button
              key={day}
              variant={idx === adjustedDayIndex ? "default" : "ghost"}
              size="sm"
              className="flex-shrink-0 min-w-[40px] sm:flex-1"
              onClick={() => {
                const diff = idx - adjustedDayIndex;
                setSelectedDate(addDays(selectedDate, diff));
              }}
            >
              {day}
            </Button>
          ))}
        </div>

        {/* Estatísticas + Filtro por profissional */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
          <Badge variant="outline" className="px-2 sm:px-3 py-1 whitespace-nowrap text-xs">
            Total: {stats.total}
          </Badge>
          <Badge variant="success" className="px-2 sm:px-3 py-1 whitespace-nowrap text-xs">
            Confirmados: {stats.confirmados}
          </Badge>
          <Badge variant="info" className="px-2 sm:px-3 py-1 whitespace-nowrap text-xs">
            Atendidos: {stats.atendidos}
          </Badge>
          <Badge variant="outline" className="px-2 sm:px-3 py-1 whitespace-nowrap text-xs">
            Vagas: {stats.vagasLivres}
          </Badge>
          <Badge variant="outline" className="px-2 sm:px-3 py-1 whitespace-nowrap text-xs">
            Ocupação: {stats.taxaOcupacao}%
          </Badge>
          
          {/* Filtro por profissional inline */}
          <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Todos profissionais" />
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
        </div>

        {/* Grid principal */}
        <Card className="flex-1 overflow-hidden min-h-0">
          <div className="h-full overflow-auto">
            <div className="min-w-max">
              {/* Header com profissionais */}
              <div className="flex sticky top-0 bg-card z-10 border-b">
                <div className="w-16 flex-shrink-0 p-2 border-r bg-muted/50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                {displayedProfissionais.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex-1 min-w-[180px] px-3 py-3 text-center font-semibold border-r truncate"
                    style={{ 
                      backgroundColor: `${prof.cor_agenda}30`,
                      borderBottom: `3px solid ${prof.cor_agenda}`
                    }}
                    title={prof.nome}
                  >
                    {prof.nome}
                  </div>
                ))}
              </div>

              {/* Grid de horários */}
              <div className="relative">
                {timeSlots.map((time) => (
                  <div key={time} className="flex border-b">
                    {/* Coluna de horários */}
                    <div className="w-16 flex-shrink-0 px-2 h-12 flex items-center justify-end text-xs text-muted-foreground border-r bg-muted/30">
                      {time}
                    </div>

                    {/* Colunas dos profissionais */}
                    {displayedProfissionais.map((prof) => {
                      const ags = getAgendamentosForSlot(time, prof.id);
                      const isOccupied = isSlotOccupied(time, prof.id);

                      return (
                        <div
                          key={prof.id}
                          className={cn(
                            "flex-1 min-w-[160px] h-12 border-r relative",
                            !isOccupied && ags.length === 0 && "hover:bg-muted/50 cursor-pointer transition-colors"
                          )}
                          onClick={() => {
                            if (!isOccupied && ags.length === 0) {
                              handleSlotClick(time, prof.id);
                            }
                          }}
                        >
                          {ags.map((ag) => {
                            const slots = getSlotsForAgendamento(ag.duracao_minutos);
                            const startTime = format(new Date(ag.data_hora), "HH:mm");
                            const endTime = getEndTime(startTime, ag.duracao_minutos);
                            const isCancelled = ag.status === "cancelado";
                            const isFaltou = ag.status === "faltou";

                            return (
                              <Popover
                                key={ag.id}
                                open={openPopoverId === ag.id}
                                onOpenChange={(open) => setOpenPopoverId(open ? ag.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer transition-all hover:shadow-lg z-10 overflow-hidden border-l-4",
                                      isCancelled && "opacity-50 line-through",
                                      isFaltou && "opacity-60"
                                    )}
                                    style={{
                                      height: `${slots * 48 - 4}px`,
                                      backgroundColor: `${ag.profissional.cor_agenda}cc`,
                                      borderLeftColor: ag.profissional.cor_agenda,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-foreground truncate">
                                        {ag.cliente.nome}
                                      </span>
                                      {isBirthday(ag.cliente) && (
                                        <Cake className="h-3 w-3 text-pink-600 flex-shrink-0" />
                                      )}
                                      {ag.status === "confirmado" && (
                                        <Check className="h-3 w-3 text-green-700 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[10px] text-foreground/80">
                                      ({startTime} às {endTime})
                                    </div>
                                    {slots > 1 && (
                                      <>
                                        <div className="text-[10px] text-foreground/80">
                                          {ag.cliente.celular || ag.cliente.telefone}
                                        </div>
                                        <div className="text-[10px] text-foreground/90 font-medium truncate">
                                          {ag.servico.nome}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent side="right" className="w-64 p-0" align="start">
                                  <div className="p-3 space-y-3">
                                    {/* Info do cliente */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{ag.cliente.nome}</span>
                                        {isBirthday(ag.cliente) && (
                                          <Cake className="h-4 w-4 text-pink-500" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span>{ag.cliente.celular || ag.cliente.telefone || "Sem telefone"}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Scissors className="h-3 w-3" />
                                        <span>{ag.servico.nome}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{startTime} às {endTime}</span>
                                      </div>
                                    </div>

                                    {/* Status badge */}
                                    <Badge className={cn("text-xs", statusConfig[ag.status].bgColor, statusConfig[ag.status].color)}>
                                      {statusConfig[ag.status].label}
                                    </Badge>

                                    {/* Botões de ação */}
                                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs flex-1"
                                        onClick={() => handleAgendamentoClick(ag)}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                      </Button>
                                      {ag.status === "agendado" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs flex-1 text-green-600 hover:text-green-700"
                                          onClick={() => handleUpdateStatus(ag.id, "confirmado")}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Confirmar
                                        </Button>
                                      )}
                                      {ag.status === "confirmado" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs flex-1 text-blue-600 hover:text-blue-700"
                                          onClick={() => handleUpdateStatus(ag.id, "atendido")}
                                        >
                                          <UserCheck className="h-3 w-3 mr-1" />
                                          Atendido
                                        </Button>
                                      )}
                                      {ag.status !== "cancelado" && ag.status !== "atendido" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs text-destructive hover:text-destructive"
                                          onClick={() => handleUpdateStatus(ag.id, "cancelado")}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal de agendamento */}
      <AgendamentoFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        agendamento={selectedAgendamento}
        initialDate={formInitialDate}
        initialTime={formInitialTime}
        initialProfissionalId={formInitialProfissionalId}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agenda;
