import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Clock,
  User,
  Receipt,
  X,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Comanda {
  id: string;
  numero_comanda: number;
  cliente_id: string | null;
  cliente_nome: string;
  profissional_nome: string;
  valor_final: number;
  data_hora: string;
  status: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface Profissional {
  id: string;
  nome: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const formatDuration = (dataHora: string) => {
  const minutes = differenceInMinutes(new Date(), parseISO(dataHora));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

interface ComandasAbertasSectionProps {
  onComandaFinalizada: () => void;
}

export const ComandasAbertasSection = ({ onComandaFinalizada }: ComandasAbertasSectionProps) => {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNovaComandaOpen, setIsNovaComandaOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedProfissional, setSelectedProfissional] = useState<string>("");
  const [searchCliente, setSearchCliente] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchComandas = useCallback(async () => {
    const { data } = await supabase
      .from("atendimentos")
      .select(`
        id,
        numero_comanda,
        cliente_id,
        valor_final,
        data_hora,
        status,
        clientes:cliente_id (nome)
      `)
      .eq("status", "aberto")
      .order("data_hora", { ascending: false });

    if (data) {
      // Map to add profissional info from atendimento_servicos
      const comandasWithProfissional = await Promise.all(
        data.map(async (comanda: any) => {
          const { data: servicos } = await supabase
            .from("atendimento_servicos")
            .select(`profissionais:profissional_id (nome)`)
            .eq("atendimento_id", comanda.id)
            .limit(1);

          return {
            ...comanda,
            cliente_nome: comanda.clientes?.nome || "Cliente não identificado",
            profissional_nome: servicos?.[0]?.profissionais?.nome || "—",
          };
        })
      );
      setComandas(comandasWithProfissional);
    }
    setLoading(false);
  }, []);

  const fetchClientesProfissionais = useCallback(async () => {
    const [{ data: cli }, { data: prof }] = await Promise.all([
      supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("profissionais").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setClientes(cli || []);
    setProfissionais(prof || []);
  }, []);

  useEffect(() => {
    fetchComandas();
    fetchClientesProfissionais();
  }, [fetchComandas, fetchClientesProfissionais]);

  const handleNovaComanda = async () => {
    if (!selectedCliente || !selectedProfissional) {
      toast({ title: "Selecione cliente e profissional", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("atendimentos").insert([{
      cliente_id: selectedCliente,
      status: "aberto",
    }]);

    if (error) {
      toast({ title: "Erro ao criar comanda", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Comanda criada!" });
      setIsNovaComandaOpen(false);
      setSelectedCliente("");
      setSelectedProfissional("");
      fetchComandas();
    }
  };

  const handleCancelarComanda = async (id: string) => {
    const { error } = await supabase
      .from("atendimentos")
      .update({ status: "cancelado" })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao cancelar comanda", variant: "destructive" });
    } else {
      toast({ title: "Comanda cancelada" });
      fetchComandas();
    }
  };

  const totalComandas = comandas.reduce((acc, c) => acc + Number(c.valor_final || 0), 0);

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchCliente.toLowerCase())
  );

  const handleAdicionarItem = (comandaId: string) => {
    // Navegar para a página de atendimentos com o atendimento específico
    navigate(`/atendimentos?atendimento=${comandaId}`);
  };

  const handleFinalizarComanda = (comandaId: string) => {
    // Navegar para atendimentos para finalizar (fechar comanda)
    navigate(`/atendimentos?atendimento=${comandaId}&finalizar=true`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <CardTitle>Comandas Abertas</CardTitle>
          {comandas.length > 0 && (
            <Badge variant="secondary">{comandas.length}</Badge>
          )}
        </div>
        <Button onClick={() => setIsNovaComandaOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Carregando...</p>
        ) : comandas.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma comanda aberta
          </p>
        ) : (
          <div className="space-y-3">
            {comandas.map((comanda) => (
              <div
                key={comanda.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      #{format(parseISO(comanda.data_hora), "HH:mm")}
                    </span>
                    <span className="text-foreground font-semibold">
                      {comanda.cliente_nome}
                    </span>
                    <span className="text-lg font-bold text-primary ml-auto">
                      {formatPrice(comanda.valor_final)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {comanda.profissional_nome}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(comanda.data_hora)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs"
                    onClick={() => handleAdicionarItem(comanda.id)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-success hover:bg-success/90"
                    onClick={() => handleFinalizarComanda(comanda.id)}
                  >
                    Finalizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancelarComanda(comanda.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total: {comandas.length} comanda{comandas.length !== 1 ? "s" : ""}
              </span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(totalComandas)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal Nova Comanda */}
      <Dialog open={isNovaComandaOpen} onOpenChange={setIsNovaComandaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Comanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                className="mb-2"
              />
              <ScrollArea className="h-32 border rounded-md">
                {filteredClientes.map((cli) => (
                  <div
                    key={cli.id}
                    className={`p-2 cursor-pointer hover:bg-muted transition-colors ${
                      selectedCliente === cli.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => setSelectedCliente(cli.id)}
                  >
                    {cli.nome}
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsNovaComandaOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleNovaComanda}>
                Abrir Comanda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
