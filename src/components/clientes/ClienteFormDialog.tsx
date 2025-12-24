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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Upload, X, Loader2 } from "lucide-react";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const clienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  celular: z.string().min(14, "Celular inválido"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  data_nascimento: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  foto_url: string | null;
  ativo: boolean;
  ultima_visita: string | null;
  total_visitas?: number;
  created_at: string;
  updated_at: string;
}

interface ClienteFormDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  cliente: Cliente | null;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function ClienteFormDialog({
  open,
  onClose,
  cliente,
}: ClienteFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!cliente;
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingFoto, setLoadingFoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "",
      celular: "",
      telefone: "",
      email: "",
      cpf: "",
      data_nascimento: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      observacoes: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (cliente) {
      form.reset({
        nome: cliente.nome,
        celular: cliente.celular,
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        cpf: cliente.cpf || "",
        data_nascimento: cliente.data_nascimento || "",
        cep: cliente.cep || "",
        endereco: cliente.endereco || "",
        numero: cliente.numero || "",
        complemento: cliente.complemento || "",
        bairro: cliente.bairro || "",
        cidade: cliente.cidade || "",
        estado: cliente.estado || "",
        observacoes: cliente.observacoes || "",
        ativo: cliente.ativo,
      });
      setFotoPreview(cliente.foto_url);
    } else {
      form.reset({
        nome: "",
        celular: "",
        telefone: "",
        email: "",
        cpf: "",
        data_nascimento: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        observacoes: "",
        ativo: true,
      });
      setFotoPreview(null);
    }
    setFotoFile(null);
  }, [cliente, form, open]);

  const buscarCep = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    if (!cep || cep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Digite um CEP com 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
        return;
      }

      form.setValue("endereco", data.logradouro || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.localidade || "");
      form.setValue("estado", data.uf || "");

      toast({
        title: "Endereço encontrado!",
        description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
      });
    } catch {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFoto = async (clienteId: string): Promise<string | null> => {
    if (!fotoFile) return cliente?.foto_url || null;

    const fileExt = fotoFile.name.split(".").pop();
    const fileName = `${clienteId}.${fileExt}`;

    const { error } = await supabase.storage
      .from("clientes-fotos")
      .upload(fileName, fotoFile, { upsert: true });

    if (error) {
      console.error("Erro upload:", error);
      return cliente?.foto_url || null;
    }

    const { data: urlData } = supabase.storage
      .from("clientes-fotos")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const onSubmit = async (data: ClienteFormData) => {
    setLoadingFoto(true);

    try {
      const payload = {
        nome: data.nome,
        celular: data.celular,
        telefone: data.telefone || null,
        email: data.email || null,
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento || null,
        cep: data.cep || null,
        endereco: data.endereco || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        observacoes: data.observacoes || null,
        ativo: data.ativo,
      };

      if (isEditing && cliente) {
        const fotoUrl = await uploadFoto(cliente.id);
        
        const { error } = await supabase
          .from("clientes")
          .update({ ...payload, foto_url: fotoUrl })
          .eq("id", cliente.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado!",
          description: "Os dados foram salvos com sucesso.",
        });
      } else {
        const { data: newCliente, error } = await supabase
          .from("clientes")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (fotoFile && newCliente) {
          const fotoUrl = await uploadFoto(newCliente.id);
          await supabase
            .from("clientes")
            .update({ foto_url: fotoUrl })
            .eq("id", newCliente.id);
        }

        toast({
          title: "Cliente cadastrado!",
          description: "Novo cliente adicionado com sucesso.",
        });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingFoto(false);
    }
  };

  const nomeValue = form.watch("nome");

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Foto */}
            <div className="flex items-center gap-6 pb-4 border-b">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={fotoPreview || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {fotoPreview ? "Alterar foto" : "Adicionar foto"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG até 5MB
                </p>
              </div>
            </div>

            {/* Dados Pessoais e Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Dados Pessoais
                </h3>

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
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
                        <InputMask
                          mask="999.999.999-99"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {(inputProps: any) => (
                            <Input {...inputProps} placeholder="000.000.000-00" />
                          )}
                        </InputMask>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Contato
                </h3>

                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular / WhatsApp *</FormLabel>
                      <FormControl>
                        <InputMask
                          mask="(99) 99999-9999"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {(inputProps: any) => (
                            <Input {...inputProps} placeholder="(00) 00000-0000" />
                          )}
                        </InputMask>
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
                      <FormLabel>Telefone Fixo</FormLabel>
                      <FormControl>
                        <InputMask
                          mask="(99) 9999-9999"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {(inputProps: any) => (
                            <Input {...inputProps} placeholder="(00) 0000-0000" />
                          )}
                        </InputMask>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Endereço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <InputMask
                            mask="99999-999"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input {...inputProps} placeholder="00000-000" />
                            )}
                          </InputMask>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={buscarCep}
                          disabled={loadingCep}
                        >
                          {loadingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Nº" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Bloco..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estados.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Outros */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Outros
              </h3>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre o cliente..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cliente Ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Clientes inativos não aparecem nas buscas
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingFoto}>
                {loadingFoto && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
