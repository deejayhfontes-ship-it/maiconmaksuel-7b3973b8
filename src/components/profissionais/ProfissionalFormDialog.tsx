import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InputMask from "react-input-mask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, DollarSign, Target, Scissors, ShoppingCart } from "lucide-react";

// iOS Official Colors for Agenda
const coresAgenda = [
  { nome: "Azul", valor: "#007AFF" },
  { nome: "Verde", valor: "#34C759" },
  { nome: "Vermelho", valor: "#FF3B30" },
  { nome: "Laranja", valor: "#FF9500" },
  { nome: "Roxo", valor: "#5856D6" },
  { nome: "Rosa", valor: "#FF2D55" },
  { nome: "Ciano", valor: "#5AC8FA" },
  { nome: "Teal", valor: "#64D2FF" },
];

const profissionalSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  data_admissao: z.string().optional(),
  funcao: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  cor_agenda: z.string(),
  ativo: z.boolean(),
  comissao_servicos: z.number().min(0).max(100),
  comissao_produtos: z.number().min(0).max(50),
  pode_vender_produtos: z.boolean(),
  meta_servicos_mes: z.number().min(0),
  meta_produtos_mes: z.number().min(0),
});

type ProfissionalFormData = z.infer<typeof profissionalSchema>;

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  funcao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  comissao_servicos: number;
  comissao_produtos: number;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
}

interface ProfissionalFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  profissional: Profissional | null;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function ProfissionalFormDialog({
  open,
  onClose,
  profissional,
}: ProfissionalFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!profissional;
  const [loading, setLoading] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("dados");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfissionalFormData>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      cpf: "",
      data_admissao: "",
      funcao: "Cabelereira",
      endereco: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      cor_agenda: "#007AFF",
      ativo: true,
      comissao_servicos: 30,
      comissao_produtos: 10,
      pode_vender_produtos: true,
      meta_servicos_mes: 0,
      meta_produtos_mes: 0,
    },
  });

  useEffect(() => {
    if (profissional) {
      form.reset({
        nome: profissional.nome,
        telefone: profissional.telefone || "",
        cpf: profissional.cpf || "",
        data_admissao: profissional.data_admissao || "",
        funcao: profissional.funcao || "Cabelereira",
        endereco: profissional.endereco || "",
        bairro: profissional.bairro || "",
        cidade: profissional.cidade || "",
        estado: profissional.estado || "",
        cep: profissional.cep || "",
        cor_agenda: profissional.cor_agenda,
        ativo: profissional.ativo,
        comissao_servicos: Number(profissional.comissao_servicos),
        comissao_produtos: Number(profissional.comissao_produtos),
        pode_vender_produtos: profissional.pode_vender_produtos,
        meta_servicos_mes: Number(profissional.meta_servicos_mes),
        meta_produtos_mes: Number(profissional.meta_produtos_mes),
      });
      setFotoPreview(profissional.foto_url);
    } else {
      form.reset({
        nome: "",
        telefone: "",
        cpf: "",
        data_admissao: "",
        funcao: "Cabelereira",
        endereco: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        cor_agenda: "#007AFF",
        ativo: true,
        comissao_servicos: 30,
        comissao_produtos: 10,
        pode_vender_produtos: true,
        meta_servicos_mes: 0,
        meta_produtos_mes: 0,
      });
      setFotoPreview(null);
    }
    setFotoFile(null);
    setActiveTab("dados");
  }, [profissional, form, open]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFoto = async (profissionalId: string): Promise<string | null> => {
    if (!fotoFile) return profissional?.foto_url || null;

    const fileExt = fotoFile.name.split(".").pop();
    const fileName = `profissionais/${profissionalId}.${fileExt}`;

    const { error } = await supabase.storage
      .from("clientes-fotos")
      .upload(fileName, fotoFile, { upsert: true });

    if (error) {
      console.error("Erro upload:", error);
      return profissional?.foto_url || null;
    }

    const { data: urlData } = supabase.storage.from("clientes-fotos").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const onSubmit = async (data: ProfissionalFormData) => {
    setLoading(true);

    try {
      const payload = {
        nome: data.nome,
        telefone: data.telefone || null,
        cpf: data.cpf || null,
        data_admissao: data.data_admissao || null,
        funcao: data.funcao || null,
        endereco: data.endereco || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        cep: data.cep || null,
        cor_agenda: data.cor_agenda,
        ativo: data.ativo,
        comissao_servicos: data.comissao_servicos,
        comissao_produtos: data.comissao_produtos,
        pode_vender_produtos: data.pode_vender_produtos,
        meta_servicos_mes: data.meta_servicos_mes,
        meta_produtos_mes: data.meta_produtos_mes,
      };

      if (isEditing && profissional) {
        const fotoUrl = await uploadFoto(profissional.id);
        
        const { error } = await supabase
          .from("profissionais")
          .update({ ...payload, foto_url: fotoUrl })
          .eq("id", profissional.id);

        if (error) throw error;

        toast({ title: "Profissional atualizado!", description: "Os dados foram salvos com sucesso." });
      } else {
        const { data: newProfissional, error } = await supabase
          .from("profissionais")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (fotoFile && newProfissional) {
          const fotoUrl = await uploadFoto(newProfissional.id);
          await supabase.from("profissionais").update({ foto_url: fotoUrl }).eq("id", newProfissional.id);
        }

        toast({ title: "Profissional cadastrado!", description: "Novo profissional adicionado com sucesso." });
      }

      onClose(true);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const nomeValue = form.watch("nome");
  const corValue = form.watch("cor_agenda");
  const podeVenderProdutos = form.watch("pode_vender_produtos");
  const comissaoServicos = form.watch("comissao_servicos");
  const comissaoProdutos = form.watch("comissao_produtos");

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                <TabsTrigger value="comissoes">Comissões</TabsTrigger>
                <TabsTrigger value="metas">Metas do Mês</TabsTrigger>
              </TabsList>

              {/* TAB 1: DADOS BÁSICOS */}
              <TabsContent value="dados" className="space-y-6 mt-4">
                {/* Foto */}
                <div className="flex items-center gap-6 pb-4 border-b">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={fotoPreview || undefined} />
                      <AvatarFallback className="text-white text-2xl" style={{ backgroundColor: corValue }}>
                        {nomeValue ? getInitials(nomeValue) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    {fotoPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeFoto}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {fotoPreview ? "Alterar foto" : "Adicionar foto"}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG até 5MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <InputMask mask="(99) 99999-9999" value={field.value} onChange={field.onChange}>
                            {(inputProps: any) => <Input {...inputProps} placeholder="(00) 00000-0000" />}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <InputMask mask="999.999.999-99" value={field.value} onChange={field.onChange}>
                            {(inputProps: any) => <Input {...inputProps} placeholder="000.000.000-00" />}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="funcao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Cabelereira, Manicure, Esteticista" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_admissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Admissão</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Status</FormLabel>
                          <p className="text-xs text-muted-foreground">{field.value ? "Ativo" : "Inativo"}</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Endereço */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-4">Endereço</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <InputMask mask="99999-999" value={field.value} onChange={field.onChange}>
                              {(inputProps: any) => <Input {...inputProps} placeholder="00000-000" />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endereco"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="UF" maxLength={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Cor da Agenda */}
                <FormField
                  control={form.control}
                  name="cor_agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor na Agenda</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 flex-wrap">
                          {coresAgenda.map((cor) => (
                            <button
                              key={cor.valor}
                              type="button"
                              onClick={() => field.onChange(cor.valor)}
                              className={`w-10 h-10 rounded-full transition-all ${
                                field.value === cor.valor ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: cor.valor }}
                              title={cor.nome}
                            />
                          ))}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* TAB 2: COMISSÕES */}
              <TabsContent value="comissoes" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scissors className="h-5 w-5 text-primary" />
                      Comissões sobre Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="comissao_servicos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentual padrão (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Aplicado automaticamente em todos os serviços prestados</FormDescription>
                        </FormItem>
                      )}
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-1">Exemplo de cálculo:</p>
                      <p className="text-muted-foreground">
                        Serviço R$ 100,00 × {comissaoServicos}% = <span className="text-success font-medium">R$ {(100 * comissaoServicos / 100).toFixed(2)}</span> de comissão
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingCart className="h-5 w-5 text-success" />
                      Comissões sobre Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pode_vender_produtos"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Permitir venda de produtos</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {field.value ? "Profissional pode vender produtos" : "Desabilitado"}
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {podeVenderProdutos && (
                      <>
                        <FormField
                          control={form.control}
                          name="comissao_produtos"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Percentual padrão (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={50}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>Aplicado em produtos vendidos durante ou fora do atendimento</FormDescription>
                            </FormItem>
                          )}
                        />
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <p className="font-medium mb-1">Exemplo de cálculo:</p>
                          <p className="text-muted-foreground">
                            Produto R$ 50,00 × {comissaoProdutos}% = <span className="text-success font-medium">R$ {(50 * comissaoProdutos / 100).toFixed(2)}</span> de comissão
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: METAS */}
              <TabsContent value="metas" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-5 w-5 text-primary" />
                      💇 Meta de Faturamento - Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="meta_servicos_mes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da meta (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              placeholder="0,00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Meta de faturamento com serviços para o mês atual
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <div className="bg-info-bg rounded-lg p-3 text-sm">
                      <p className="text-info-text">
                        💡 O progresso será calculado automaticamente com base nos atendimentos fechados
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-5 w-5 text-success" />
                      🛒 Meta de Faturamento - Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="meta_produtos_mes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da meta (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              placeholder="0,00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Meta de faturamento com produtos para o mês atual
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <div className="bg-info-bg rounded-lg p-3 text-sm">
                      <p className="text-info-text">
                        💡 O progresso será calculado automaticamente com base nas vendas de produtos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}