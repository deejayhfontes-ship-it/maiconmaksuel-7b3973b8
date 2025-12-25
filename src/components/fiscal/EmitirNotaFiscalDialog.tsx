import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Building2, ChevronLeft, ChevronRight, Plus, Trash2, 
  Search, User, Package, CheckCircle2, XCircle, Loader2, Download,
  Send, Printer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmitirNotaFiscalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimentoId?: string;
}

interface ItemNota {
  id: string;
  tipo: "servico" | "produto";
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_desconto: number;
  valor_total: number;
  aliquota_iss: number;
  aliquota_icms: number;
}

const STEPS = [
  { id: 1, title: "Tipo de Nota", icon: FileText },
  { id: 2, title: "Cliente", icon: User },
  { id: 3, title: "Itens", icon: Package },
  { id: 4, title: "Totais", icon: FileText },
  { id: 5, title: "Emissão", icon: Send },
];

export function EmitirNotaFiscalDialog({ open, onOpenChange, atendimentoId }: EmitirNotaFiscalDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [tipoNota, setTipoNota] = useState<"nfe" | "nfce">("nfce");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCpfCnpj, setClienteCpfCnpj] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [itens, setItens] = useState<ItemNota[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [imprimir, setImprimir] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [resultadoEmissao, setResultadoEmissao] = useState<{
    sucesso: boolean;
    numero?: number;
    chave?: string;
    protocolo?: string;
    mensagem?: string;
  } | null>(null);

  // Query para buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ["clientes-busca", buscaCliente],
    queryFn: async () => {
      if (!buscaCliente || buscaCliente.length < 2) return [];
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cpf, celular, endereco, bairro, cidade")
        .ilike("nome", `%${buscaCliente}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: buscaCliente.length >= 2,
  });

  // Query para buscar serviços
  const { data: servicos } = useQuery({
    queryKey: ["servicos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Query para buscar produtos
  const { data: produtos } = useQuery({
    queryKey: ["produtos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Query para buscar configurações fiscais
  const { data: configFiscal } = useQuery({
    queryKey: ["configuracoes-fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_fiscal")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Mutation para criar nota fiscal
  const criarNotaMutation = useMutation({
    mutationFn: async (dados: {
      tipo: string;
      numero: number;
      serie: number;
      status: string;
      cliente_id: string | null;
      cliente_nome: string | null;
      cliente_cpf_cnpj: string | null;
      cliente_endereco: string | null;
      atendimento_id: string | null;
      valor_total: number;
      valor_servicos: number;
      valor_produtos: number;
      valor_desconto: number;
      base_calculo_iss: number;
      valor_iss: number;
      observacoes: string | null;
    }) => {
      const { data: nota, error } = await supabase
        .from("notas_fiscais")
        .insert([dados])
        .select()
        .single();
      if (error) throw error;

      // Inserir itens
      if (itens.length > 0) {
        const itensParaInserir = itens.map(item => ({
          nota_fiscal_id: nota.id,
          tipo: item.tipo,
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          valor_desconto: item.valor_desconto,
          aliquota_iss: item.aliquota_iss,
          aliquota_icms: item.aliquota_icms,
        }));

        const { error: errorItens } = await supabase
          .from("itens_nota_fiscal")
          .insert(itensParaInserir);
        if (errorItens) throw errorItens;
      }

      return nota;
    },
    onSuccess: (nota) => {
      // Simular emissão (em produção, chamaria a API real)
      setTimeout(() => {
        setResultadoEmissao({
          sucesso: true,
          numero: nota.numero,
          chave: "3525 1234 5678 9012 3456 7890 1234 5678 9012 3456 7",
          protocolo: "135" + Date.now().toString().slice(-12),
        });
        setEmitindo(false);
        queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      }, 2000);
    },
    onError: (error) => {
      setResultadoEmissao({
        sucesso: false,
        mensagem: error.message,
      });
      setEmitindo(false);
    },
  });

  // Calcular totais
  const calcularTotais = () => {
    const valorServicos = itens
      .filter(i => i.tipo === "servico")
      .reduce((acc, i) => acc + i.valor_total, 0);
    const valorProdutos = itens
      .filter(i => i.tipo === "produto")
      .reduce((acc, i) => acc + i.valor_total, 0);
    const valorDesconto = itens.reduce((acc, i) => acc + i.valor_desconto, 0);
    const subtotal = valorServicos + valorProdutos;
    const valorTotal = subtotal - valorDesconto;
    const baseCalculoIss = valorServicos;
    const aliquotaIss = configFiscal?.aliquota_iss || 3;
    const valorIss = baseCalculoIss * (aliquotaIss / 100);

    return {
      valorServicos,
      valorProdutos,
      valorDesconto,
      subtotal,
      valorTotal,
      baseCalculoIss,
      valorIss,
    };
  };

  const totais = calcularTotais();

  // Adicionar item
  const adicionarItem = (tipo: "servico" | "produto", itemOriginal: typeof servicos[0] | typeof produtos[0]) => {
    const novoItem: ItemNota = {
      id: crypto.randomUUID(),
      tipo,
      codigo: itemOriginal.id.slice(0, 8),
      descricao: itemOriginal.nome,
      ncm: "",
      cfop: tipo === "servico" ? (configFiscal?.cfop_servicos || "5933") : (configFiscal?.cfop_produtos || "5102"),
      unidade: "UN",
      quantidade: 1,
      valor_unitario: tipo === "servico" ? (itemOriginal as typeof servicos[0]).preco : (itemOriginal as typeof produtos[0]).preco_venda,
      valor_desconto: 0,
      valor_total: tipo === "servico" ? (itemOriginal as typeof servicos[0]).preco : (itemOriginal as typeof produtos[0]).preco_venda,
      aliquota_iss: tipo === "servico" ? (configFiscal?.aliquota_iss || 3) : 0,
      aliquota_icms: tipo === "produto" ? (configFiscal?.aliquota_icms || 0) : 0,
    };
    setItens(prev => [...prev, novoItem]);
  };

  // Remover item
  const removerItem = (id: string) => {
    setItens(prev => prev.filter(i => i.id !== id));
  };

  // Atualizar quantidade
  const atualizarQuantidade = (id: string, quantidade: number) => {
    setItens(prev => prev.map(i => {
      if (i.id === id) {
        const valorTotal = quantidade * i.valor_unitario - i.valor_desconto;
        return { ...i, quantidade, valor_total: Math.max(0, valorTotal) };
      }
      return i;
    }));
  };

  // Emitir nota
  const emitirNota = () => {
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item à nota");
      return;
    }

    setEmitindo(true);
    const proximoNumero = tipoNota === "nfce" 
      ? (configFiscal?.numero_proximo_nfce || 1)
      : (configFiscal?.numero_proximo_nfe || 1);
    const serie = tipoNota === "nfce"
      ? (configFiscal?.serie_nfce || 1)
      : (configFiscal?.serie_nfe || 1);

    criarNotaMutation.mutate({
      tipo: tipoNota,
      numero: proximoNumero,
      serie,
      status: "processando",
      cliente_id: clienteId,
      cliente_nome: clienteNome || null,
      cliente_cpf_cnpj: clienteCpfCnpj || null,
      cliente_endereco: clienteEndereco || null,
      atendimento_id: atendimentoId || null,
      valor_total: totais.valorTotal,
      valor_servicos: totais.valorServicos,
      valor_produtos: totais.valorProdutos,
      valor_desconto: totais.valorDesconto,
      base_calculo_iss: totais.baseCalculoIss,
      valor_iss: totais.valorIss,
      observacoes: observacoes || null,
    });
  };

  // Resetar modal ao fechar
  const handleClose = (open: boolean) => {
    if (!open) {
      setStep(1);
      setTipoNota("nfce");
      setClienteId(null);
      setClienteNome("");
      setClienteCpfCnpj("");
      setClienteEndereco("");
      setItens([]);
      setObservacoes("");
      setResultadoEmissao(null);
    }
    onOpenChange(open);
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Emitir Nota Fiscal</DialogTitle>
          <DialogDescription>
            Siga os passos para emitir a nota fiscal eletrônica
          </DialogDescription>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2",
                  step >= s.id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step >= s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {s.id}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{s.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 sm:w-16 h-0.5 mx-2",
                  step > s.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 p-6">
          {/* Step 1: Tipo de Nota */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Selecione o tipo de nota</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg",
                    tipoNota === "nfce" && "ring-2 ring-primary"
                  )}
                  onClick={() => setTipoNota("nfce")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">NFC-e</h4>
                        <p className="text-sm text-muted-foreground">Consumidor Final</p>
                        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Mais comum para salões
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Rápido e simples
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg",
                    tipoNota === "nfe" && "ring-2 ring-primary"
                  )}
                  onClick={() => setTipoNota("nfe")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-info" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">NF-e</h4>
                        <p className="text-sm text-muted-foreground">Empresas (CNPJ)</p>
                        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Obrigatório para PJ
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Aceita todos os produtos
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Cliente */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Dados do Cliente</h3>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente cadastrado..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {clientes && clientes.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {clientes.map((cliente) => (
                      <div
                        key={cliente.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          clienteId === cliente.id && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                        onClick={() => {
                          setClienteId(cliente.id);
                          setClienteNome(cliente.nome);
                          setClienteCpfCnpj(cliente.cpf || "");
                          setClienteEndereco(
                            [cliente.endereco, cliente.bairro, cliente.cidade]
                              .filter(Boolean)
                              .join(", ")
                          );
                          setBuscaCliente("");
                        }}
                      >
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">{cliente.cpf || cliente.celular}</div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ou preencha manualmente (para NFC-e os dados são opcionais)
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Cliente</Label>
                      <Input
                        id="nome"
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                      <Input
                        id="cpf_cnpj"
                        value={clienteCpfCnpj}
                        onChange={(e) => setClienteCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                  {tipoNota === "nfe" && (
                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={clienteEndereco}
                        onChange={(e) => setClienteEndereco(e.target.value)}
                        placeholder="Endereço completo"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Itens */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Itens da Nota</h3>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => {
                    const servico = servicos?.find(s => s.id === value);
                    if (servico) adicionarItem("servico", servico);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Serviço
                    </SelectTrigger>
                    <SelectContent>
                      {servicos?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome} - {formatarValor(s.preco)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(value) => {
                    const produto = produtos?.find(p => p.id === value);
                    if (produto) adicionarItem("produto", produto);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Produto
                    </SelectTrigger>
                    <SelectContent>
                      {produtos?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} - {formatarValor(p.preco_venda)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {itens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[80px]">Und</TableHead>
                      <TableHead className="w-[80px] text-center">Qtd</TableHead>
                      <TableHead className="w-[100px] text-right">Valor Un</TableHead>
                      <TableHead className="w-[100px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.tipo === "servico" ? "Serv" : "Prod"}
                            </Badge>
                            {item.descricao}
                          </div>
                        </TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => atualizarQuantidade(item.id, parseInt(e.target.value) || 1)}
                            className="h-8 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatarValor(item.valor_unitario)}</TableCell>
                        <TableCell className="text-right font-medium">{formatarValor(item.valor_total)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removerItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="font-medium">Nenhum item adicionado</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use os botões acima para adicionar serviços ou produtos
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Totais */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Resumo da Nota</h3>

              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4">RESUMO DA NOTA</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal Serviços:</span>
                      <span>{formatarValor(totais.valorServicos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal Produtos:</span>
                      <span>{formatarValor(totais.valorProdutos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descontos:</span>
                      <span className="text-destructive">-{formatarValor(totais.valorDesconto)}</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Cálculo ISS:</span>
                      <span>{formatarValor(totais.baseCalculoIss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ISS ({configFiscal?.aliquota_iss || 3}%):</span>
                      <span>{formatarValor(totais.valorIss)}</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL:</span>
                      <span className="text-primary">{formatarValor(totais.valorTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais que aparecerão na nota"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 5: Emissão */}
          {step === 5 && !resultadoEmissao && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Revisar e Emitir</h3>

              <Card className="bg-muted/30">
                <CardContent className="p-6 font-mono text-sm">
                  <div className="text-center mb-4">
                    <h4 className="font-bold">DANFE - Documento Auxiliar {tipoNota === "nfce" ? "NFC-e" : "NF-e"}</h4>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                    <p className="font-bold">{configFiscal?.empresa_razao_social || "EMPRESA NÃO CONFIGURADA"}</p>
                    <p>CNPJ: {configFiscal?.cnpj || "00.000.000/0000-00"}</p>
                    <p>{configFiscal?.endereco_cidade || "Cidade"} - {configFiscal?.endereco_uf || "UF"}</p>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                    <p>Cliente: {clienteNome || "Consumidor Final"}</p>
                    {clienteCpfCnpj && <p>CPF/CNPJ: {clienteCpfCnpj}</p>}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                    {itens.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.descricao} x{item.quantidade}</span>
                        <span>{formatarValor(item.valor_total)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatarValor(totais.valorTotal)}</span>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground text-center">Chave: [será gerada]</p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enviar_email"
                    checked={enviarEmail}
                    onCheckedChange={(checked) => setEnviarEmail(checked as boolean)}
                  />
                  <Label htmlFor="enviar_email" className="cursor-pointer">
                    Enviar nota por email para o cliente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="imprimir"
                    checked={imprimir}
                    onCheckedChange={(checked) => setImprimir(checked as boolean)}
                  />
                  <Label htmlFor="imprimir" className="cursor-pointer">
                    Imprimir após emissão
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Resultado da Emissão */}
          {resultadoEmissao && (
            <div className="space-y-6">
              {resultadoEmissao.sucesso ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-success">Nota Fiscal Autorizada!</h3>
                  <div className="mt-6 space-y-2 text-sm">
                    <p><strong>Número:</strong> {String(resultadoEmissao.numero).padStart(6, "0")}</p>
                    <p className="font-mono text-xs break-all"><strong>Chave:</strong> {resultadoEmissao.chave}</p>
                    <p><strong>Protocolo:</strong> {resultadoEmissao.protocolo}</p>
                  </div>
                  <div className="flex justify-center gap-3 mt-6">
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Baixar XML
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Printer className="h-4 w-4" />
                      Baixar PDF
                    </Button>
                    <Button onClick={() => handleClose(false)}>
                      Concluir
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold text-destructive">Nota Rejeitada</h3>
                  <p className="mt-4 text-muted-foreground">{resultadoEmissao.mensagem}</p>
                  <div className="flex justify-center gap-3 mt-6">
                    <Button variant="outline" onClick={() => setResultadoEmissao(null)}>
                      Corrigir
                    </Button>
                    <Button variant="outline" onClick={() => handleClose(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer com navegação */}
        {!resultadoEmissao && (
          <div className="flex items-center justify-between border-t p-4">
            <Button
              variant="outline"
              onClick={() => setStep(prev => prev - 1)}
              disabled={step === 1 || emitindo}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="flex gap-2">
              {step < 5 ? (
                <Button onClick={() => setStep(prev => prev + 1)}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={emitirNota} disabled={emitindo || itens.length === 0}>
                  {emitindo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando para SEFAZ...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Emitir Nota Fiscal
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
