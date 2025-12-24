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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

const coresAgenda = [
  { nome: "Azul", valor: "#3b82f6" },
  { nome: "Verde", valor: "#22c55e" },
  { nome: "Vermelho", valor: "#ef4444" },
  { nome: "Laranja", valor: "#f97316" },
  { nome: "Roxo", valor: "#8b5cf6" },
  { nome: "Rosa", valor: "#ec4899" },
  { nome: "Amarelo", valor: "#eab308" },
];

const especialidades = [
  "Cabelereira",
  "Colorista",
  "Manicure",
  "Pedicure",
  "Designer de Sobrancelhas",
  "Maquiadora",
  "Esteticista",
];

const profissionalSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  data_admissao: z.string().optional(),
  especialidade: z.string().min(1, "Selecione uma especialidade"),
  comissao_padrao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  cor_agenda: z.string(),
  ativo: z.boolean(),
});

type ProfissionalFormData = z.infer<typeof profissionalSchema>;

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  especialidade: string | null;
  comissao_padrao: number;
  cor_agenda: string;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
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
  const [loadingFoto, setLoadingFoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfissionalFormData>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      cpf: "",
      data_admissao: "",
      especialidade: "Cabelereira",
      comissao_padrao: 30,
      cor_agenda: "#3b82f6",
      ativo: true,
    },
  });

  useEffect(() => {
    if (profissional) {
      form.reset({
        nome: profissional.nome,
        telefone: profissional.telefone || "",
        cpf: profissional.cpf || "",
        data_admissao: profissional.data_admissao || "",
        especialidade: profissional.especialidade || "Cabelereira",
        comissao_padrao: Number(profissional.comissao_padrao),
        cor_agenda: profissional.cor_agenda,
        ativo: profissional.ativo,
      });
      setFotoPreview(profissional.foto_url);
    } else {
      form.reset({
        nome: "",
        telefone: "",
        cpf: "",
        data_admissao: "",
        especialidade: "Cabelereira",
        comissao_padrao: 30,
        cor_agenda: "#3b82f6",
        ativo: true,
      });
      setFotoPreview(null);
    }
    setFotoFile(null);
  }, [profissional, form, open]);

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

    const { data: urlData } = supabase.storage
      .from("clientes-fotos")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const onSubmit = async (data: ProfissionalFormData) => {
    setLoadingFoto(true);

    try {
      const payload = {
        nome: data.nome,
        telefone: data.telefone || null,
        cpf: data.cpf || null,
        data_admissao: data.data_admissao || null,
        especialidade: data.especialidade,
        comissao_padrao: data.comissao_padrao,
        cor_agenda: data.cor_agenda,
        ativo: data.ativo,
      };

      if (isEditing && profissional) {
        const fotoUrl = await uploadFoto(profissional.id);
        
        const { error } = await supabase
          .from("profissionais")
          .update({ ...payload, foto_url: fotoUrl })
          .eq("id", profissional.id);

        if (error) throw error;

        toast({
          title: "Profissional atualizado!",
          description: "Os dados foram salvos com sucesso.",
        });
      } else {
        const { data: newProfissional, error } = await supabase
          .from("profissionais")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (fotoFile && newProfissional) {
          const fotoUrl = await uploadFoto(newProfissional.id);
          await supabase
            .from("profissionais")
            .update({ foto_url: fotoUrl })
            .eq("id", newProfissional.id);
        }

        toast({
          title: "Profissional cadastrado!",
          description: "Novo profissional adicionado com sucesso.",
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
  const corValue = form.watch("cor_agenda");

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Foto */}
            <div className="flex items-center gap-6 pb-4 border-b">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={fotoPreview || undefined} />
                  <AvatarFallback 
                    className="text-white text-2xl"
                    style={{ backgroundColor: corValue }}
                  >
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

            {/* Campos */}
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
                name="especialidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {especialidades.map((esp) => (
                          <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                name="comissao_padrao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão Padrão (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                            field.value === cor.valor 
                              ? "ring-2 ring-offset-2 ring-primary scale-110" 
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: cor.valor }}
                          title={cor.nome}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "Profissional ativo" : "Profissional inativo"}
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

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loadingFoto} className="bg-success hover:bg-success/90">
                {loadingFoto && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
