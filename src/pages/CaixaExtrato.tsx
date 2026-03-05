import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ListOrdered,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Printer,
  Filter,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Movimentacao {
  id: string;
  tipo: string;
  categoria: string | null;
  descricao: string;
  valor: number;
  forma_pagamento: string | null;
  data_hora: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaExtrato() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [caixaId, setCaixaId] = useState<string | null>(null);
  const [tab, setTab] = useState("todas");
  const [search, setSearch] = useState("");
  const [formaPagFilter, setFormaPagFilter] = useState("todas");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: caixa } = await supabase
      .from("caixa")
      .select("id")
      .eq("status", "aberto")
      .order("data_abertura", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!caixa) {
      setMovimentacoes([]);
      setLoading(false);
      return;
    }

    setCaixaId(caixa.id);

    const { data: movs } = await supabase
      .from("caixa_movimentacoes")
      .select("*")
      .eq("caixa_id", caixa.id)
      .order("data_hora", { ascending: false });

    setMovimentacoes(movs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMovimentacoes = movimentacoes.filter((mov) => {
    const matchSearch = mov.descricao.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "todas" || 
      (tab === "entradas" && (mov.tipo === "entrada" || mov.tipo === "reforco")) ||
      (tab === "saidas" && (mov.tipo === "saida" || mov.tipo === "sangria"));
    const matchFormaPag = formaPagFilter === "todas" || mov.forma_pagamento === formaPagFilter;
    
    return matchSearch && matchTab && matchFormaPag;
  });

  const calcularSaldoAcumulado = (index: number) => {
    // Começar do valor inicial do caixa (assumindo 0 por simplicidade)
    // Para um cálculo real, precisaríamos do valor inicial
    let saldo = 0;
    for (let i = movimentacoes.length - 1; i >= index; i--) {
      const mov = movimentacoes[i];
      if (mov.tipo === "entrada" || mov.tipo === "reforco") {
        saldo += Number(mov.valor);
      } else {
        saldo -= Number(mov.valor);
      }
    }
    return saldo;
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <Badge className="bg-success">Entrada</Badge>;
      case "saida":
        return <Badge variant="destructive">Saída</Badge>;
      case "sangria":
        return <Badge className="bg-warning text-warning-foreground">Sangria</Badge>;
      case "reforco":
        return <Badge className="bg-info text-info-foreground">Reforço</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Extrato da Gaveta</h1>
            <p className="text-muted-foreground">{filteredMovimentacoes.length} movimentações</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar movimentação..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={formaPagFilter} onValueChange={setFormaPagFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Forma de pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="debito">Débito</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filteredMovimentacoes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ListOrdered className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMovimentacoes.map((mov, index) => (
                <Card key={mov.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Ícone */}
                      <div className={cn(
                        "p-3 rounded-full shrink-0",
                        mov.tipo === "entrada" || mov.tipo === "reforco"
                          ? "bg-success/10"
                          : "bg-destructive/10"
                      )}>
                        {mov.tipo === "entrada" || mov.tipo === "reforco" ? (
                          <TrendingUp className={cn(
                            "h-5 w-5",
                            mov.tipo === "entrada" || mov.tipo === "reforco"
                              ? "text-success"
                              : "text-destructive"
                          )} />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getTipoBadge(mov.tipo)}
                          {mov.forma_pagamento && (
                            <Badge variant="outline" className="capitalize">
                              {mov.forma_pagamento}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mt-1 truncate">{mov.descricao}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(mov.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-xl font-bold",
                          mov.tipo === "entrada" || mov.tipo === "reforco"
                            ? "text-success"
                            : "text-destructive"
                        )}>
                          {mov.tipo === "entrada" || mov.tipo === "reforco" ? "+" : "-"}
                          {formatPrice(mov.valor)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resumo */}
      {filteredMovimentacoes.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-lg font-bold text-success">
                  {formatPrice(
                    filteredMovimentacoes
                      .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
                      .reduce((acc, m) => acc + Number(m.valor), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-lg font-bold text-destructive">
                  {formatPrice(
                    filteredMovimentacoes
                      .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
                      .reduce((acc, m) => acc + Number(m.valor), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Movimentações</p>
                <p className="text-lg font-bold">{filteredMovimentacoes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
