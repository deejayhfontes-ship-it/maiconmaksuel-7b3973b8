import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  CalendarPlus,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Horários do dia (30 em 30 min)
const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

// Profissionais de exemplo
const professionals = [
  { id: 1, name: "Maria" },
  { id: 2, name: "Juliana" },
  { id: 3, name: "Daniela" },
  { id: 4, name: "Patricia" },
];

// Agendamentos de exemplo
const sampleAppointments = [
  {
    id: 1,
    professionalId: 1,
    clientName: "Lúcia Correa",
    phone: "9999-1234",
    service: "Corte Feminino",
    startTime: "10:30",
    endTime: "11:30",
    isBirthday: false,
  },
  {
    id: 2,
    professionalId: 2,
    clientName: "Priscila Lopes",
    phone: "3333-0238",
    service: "Escova",
    startTime: "10:00",
    endTime: "11:30",
    isBirthday: true,
  },
  {
    id: 3,
    professionalId: 1,
    clientName: "Amanda Freitas",
    phone: "9988-5566",
    service: "Manicure",
    startTime: "11:30",
    endTime: "12:30",
    isBirthday: false,
  },
  {
    id: 4,
    professionalId: 2,
    clientName: "Denise Silva",
    phone: "9977-4455",
    service: "Pedicure",
    startTime: "11:30",
    endTime: "12:30",
    isBirthday: false,
  },
  {
    id: 5,
    professionalId: 3,
    clientName: "Carla Mendes",
    phone: "9966-3344",
    service: "Coloração",
    startTime: "14:00",
    endTime: "16:00",
    isBirthday: false,
  },
];

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const goToToday = () => setSelectedDate(new Date());
  const goToPrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToPrevWeek = () => setSelectedDate(subDays(selectedDate, 7));
  const goToNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  const getAppointmentStyle = (startTime: string, endTime: string) => {
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = timeSlots.indexOf(endTime);
    const slots = endIndex - startIndex;
    return {
      top: `${startIndex * 40}px`,
      height: `${slots * 40 - 2}px`,
    };
  };

  const getAppointmentsForProfessional = (professionalId: number) => {
    return sampleAppointments.filter((apt) => apt.professionalId === professionalId);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Sidebar com calendário */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <Card className="p-4">
          {/* Data atual */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-foreground capitalize">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </h2>
            <p className="text-muted-foreground">
              ({format(selectedDate, "dd / MMM / yyyy", { locale: ptBR })})
            </p>
          </div>

          {/* Navegação */}
          <div className="flex items-center justify-center gap-1 mb-4">
            <Button variant="outline" size="icon" onClick={goToPrevWeek}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mini calendário */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ptBR}
            className="rounded-md border pointer-events-auto"
          />
        </Card>

        {/* Botões de ação */}
        <Card className="p-4 space-y-2">
          <Button className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" />
            Agendar
          </Button>
          <Button className="w-full justify-start gap-2" variant="outline">
            <CalendarPlus className="h-4 w-4" />
            Encaixar
          </Button>
        </Card>

        {/* Legenda */}
        <Card className="p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎂</span>
            <span className="text-muted-foreground">= Faz aniversário hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 bg-warning/20 border border-warning rounded" />
            <span className="text-muted-foreground">= Cadastro incompleto</span>
          </div>
        </Card>
      </div>

      {/* Grade de horários */}
      <Card className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="min-w-max">
            {/* Header com profissionais */}
            <div className="flex sticky top-0 bg-card z-10 border-b">
              <div className="w-16 flex-shrink-0 p-2 border-r bg-muted/50" />
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="w-40 flex-shrink-0 p-3 text-center font-semibold border-r bg-muted/50"
                >
                  {prof.name}
                </div>
              ))}
            </div>

            {/* Grid de horários */}
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

              {/* Colunas dos profissionais */}
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="w-40 flex-shrink-0 border-r relative"
                >
                  {/* Linhas de horário */}
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="h-10 border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    />
                  ))}

                  {/* Agendamentos */}
                  {getAppointmentsForProfessional(prof.id).map((apt) => (
                    <Tooltip key={apt.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute left-1 right-1 rounded px-2 py-1 cursor-pointer transition-all hover:shadow-md",
                            "bg-primary/20 border-l-4 border-primary text-foreground"
                          )}
                          style={getAppointmentStyle(apt.startTime, apt.endTime)}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium truncate">
                            {apt.clientName}
                            {apt.isBirthday && <span>🎂</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {apt.service}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-3">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {apt.clientName}{" "}
                            <span className="font-normal text-muted-foreground">
                              ({apt.startTime} às {apt.endTime})
                            </span>
                          </p>
                          <p className="text-sm">{apt.phone}</p>
                          <p className="text-sm text-muted-foreground">{apt.service}</p>
                          {apt.isBirthday && (
                            <p className="text-sm text-warning">🎂 Aniversário hoje!</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Agenda;
