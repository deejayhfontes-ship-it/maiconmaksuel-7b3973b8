import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Briefcase, CreditCard, Gift, Upload, Plus, Trash2 } from "lucide-react";

interface Funcionario {
  id?: string;
  nome: string;
  foto_url?: string | null;
  cpf: string;
  rg?: string | null;
  data_nascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco_completo?: string | null;
  cep?: string | null;
  cargo: string;
  cargo_customizado?: string | null;
  departamento?: string | null;
  data_admissao: string;
  tipo_contrato: string;
  salario_base: number;
  vale_transporte?: number;
  vale_refeicao?: number;
  plano_saude?: number;
  outros_beneficios?: Array<{ nome: string; valor: number; desconta: boolean }>;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: string | null;
  pix_chave?: string | null;
  pix_tipo?: string | null;
  jornada_entrada?: string | null;
  jornada_saida_almoco?: string | null;
  jornada_entrada_tarde?: string | null;
  jornada_saida?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

interface FuncionarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionario?: Funcionario | null;
  onSuccess: () => void;
}

const cargos = [
  { value: "secretaria", label: "Secretária" },
  { value: "gerente", label: "Gerente" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "auxiliar_limpeza", label: "Auxiliar de Limpeza" },
  { value: "outro", label: "Outro" },
];

const departamentos = [
  { value: "administrativo", label: "Administrativo" },
  { value: "atendimento", label: "Atendimento" },
  { value: "limpeza", label: "Limpeza" },
  { value: "gerencia", label: "Gerência" },
];

const tiposContrato = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "temporario", label: "Temporário" },
  { value: "estagiario", label: "Estagiário" },
];

const bancos = [
  { value: "001", label: "Banco do Brasil" },
  { value: "033", label: "Santander" },
  { value: "104", label: "Caixa Econômica" },
  { value: "237", label: "Bradesco" },
  { value: "341", label: "Itaú" },
  { value: "260", label: "Nubank" },
  { value: "077", label: "Inter" },
  { value: "212", label: "Original" },
  { value: "336", label: "C6 Bank" },
  { value: "outro", label: "Outro" },
];

const defaultForm: Funcionario = {
  nome: "",
  cpf: "",
  cargo: "secretaria",
  departamento: "administrativo",
  data_admissao: new Date().toISOString().split("T")[0],
  tipo_contrato: "clt",
  salario_base: 0,
  vale_transporte: 0,
  vale_refeicao: 0,
  plano_saude: 0,
  outros_beneficios: [],
  tipo_conta: "corrente",
  jornada_entrada: "08:00",
  jornada_saida_almoco: "12:00",
  jornada_entrada_tarde: "13:00",
  jornada_saida: "18:00",
  ativo: true,
};

export function FuncionarioFormDialog({ open, onOpenChange, funcionario, onSuccess }: FuncionarioFormDialogProps) {
  const [form, setForm] = useState<Funcionario>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pessoais");

  useEffect(() => {
    if (funcionario) {
      setForm({
        ...defaultForm,
        ...funcionario,
        outros_beneficios: Array.isArray(funcionario.outros_beneficios) 
          ? funcionario.outros_beneficios 
          : [],
      });
    } else {
      setForm(defaultForm);
    }
    setActiveTab("pessoais");
  }, [funcionario, open]);

  const handleChange = (field: keyof Funcionario, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddBeneficio = () => {
    const beneficios = form.outros_beneficios || [];
    handleChange("outros_beneficios", [...beneficios, { nome: "", valor: 0, desconta: false }]);
  };

  const handleRemoveBeneficio = (index: number) => {
    const beneficios = form.outros_beneficios || [];
    handleChange("outros_beneficios", beneficios.filter((_, i) => i !== index));
  };

  const handleUpdateBeneficio = (index: number, field: string, value: any) => {
    const beneficios = [...(form.outros_beneficios || [])];
    beneficios[index] = { ...beneficios[index], [field]: value };
    handleChange("outros_beneficios", beneficios);
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        handleChange("endereco_completo", `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0];

  const handleSave = async () => {
    if (!form.nome || !form.cpf || !form.data_admissao || !form.salario_base) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    console.log('[FUNCIONARIO] write_start', { nome: form.nome, cpf: form.cpf, projectRef, isEdit: !!funcionario?.id });
    try {
      const data = {
        nome: form.nome,
        foto_url: form.foto_url,
        cpf: form.cpf.replace(/\D/g, ""),
        rg: form.rg,
        data_nascimento: form.data_nascimento || null,
        telefone: form.telefone,
        email: form.email,
        endereco_completo: form.endereco_completo,
        cep: form.cep?.replace(/\D/g, ""),
        cargo: form.cargo,
        cargo_customizado: form.cargo === "outro" ? form.cargo_customizado : null,
        departamento: form.departamento,
        data_admissao: form.data_admissao,
        tipo_contrato: form.tipo_contrato,
        salario_base: Number(form.salario_base),
        vale_transporte: Number(form.vale_transporte) || 0,
        vale_refeicao: Number(form.vale_refeicao) || 0,
        plano_saude: Number(form.plano_saude) || 0,
        outros_beneficios: form.outros_beneficios,
        banco: form.banco,
        agencia: form.agencia,
        conta: form.conta,
        tipo_conta: form.tipo_conta,
        pix_chave: form.pix_chave,
        pix_tipo: form.pix_tipo,
        jornada_entrada: form.jornada_entrada,
        jornada_saida_almoco: form.jornada_saida_almoco,
        jornada_entrada_tarde: form.jornada_entrada_tarde,
        jornada_saida: form.jornada_saida,
        observacoes: form.observacoes,
        ativo: form.ativo ?? true,
      };

      if (funcionario?.id) {
        const { data: retData, error } = await supabase
          .from("funcionarios")
          .update(data)
          .eq("id", funcionario.id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        console.info('[FUNCIONARIO] write_ok', { id: retData?.id || funcionario.id, projectRef });
        toast.success("Funcionário atualizado com sucesso!");
      } else {
        const { data: retData, error } = await supabase.from("funcionarios").insert(data).select('id').maybeSingle();
        if (error) throw error;
        console.info('[FUNCIONARIO] write_ok', { id: retData?.id, projectRef });
        toast.success("Funcionário cadastrado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[FUNCIONARIO] write_fail', { error: error.message, code: error.code, projectRef });
      if (error.code === "23505") {
        toast.error("CPF já cadastrado no sistema");
      } else {
        toast.error(`Erro ao salvar funcionário: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {funcionario?.id ? "Editar Funcionário" : "Novo Funcionário"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pessoais" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1 hidden sm:inline" />
              Pessoais
            </TabsTrigger>
            <TabsTrigger value="contratuais" className="text-xs sm:text-sm">
              <Briefcase className="h-4 w-4 mr-1 hidden sm:inline" />
              Contrato
            </TabsTrigger>
            <TabsTrigger value="bancarios" className="text-xs sm:text-sm">
              <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" />
              Bancários
            </TabsTrigger>
            <TabsTrigger value="beneficios" className="text-xs sm:text-sm">
              <Gift className="h-4 w-4 mr-1 hidden sm:inline" />
              Benefícios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais" className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.foto_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {form.nome?.charAt(0)?.toUpperCase() || "F"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Alterar Foto
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input
                  value={form.rg || ""}
                  onChange={(e) => handleChange("rg", e.target.value)}
                  placeholder="RG"
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={form.data_nascimento || ""}
                  onChange={(e) => handleChange("data_nascimento", e.target.value)}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone || ""}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={form.cep || ""}
                  onChange={(e) => handleChange("cep", e.target.value)}
                  onBlur={(e) => buscarCep(e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço Completo</Label>
                <Textarea
                  value={form.endereco_completo || ""}
                  onChange={(e) => handleChange("endereco_completo", e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contratuais" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cargo *</Label>
                <Select value={form.cargo} onValueChange={(v) => handleChange("cargo", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cargos.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.cargo === "outro" && (
                <div>
                  <Label>Cargo Customizado</Label>
                  <Input
                    value={form.cargo_customizado || ""}
                    onChange={(e) => handleChange("cargo_customizado", e.target.value)}
                    placeholder="Especifique o cargo"
                  />
                </div>
              )}
              <div>
                <Label>Departamento *</Label>
                <Select value={form.departamento || "administrativo"} onValueChange={(v) => handleChange("departamento", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Contrato *</Label>
                <Select value={form.tipo_contrato} onValueChange={(v) => handleChange("tipo_contrato", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposContrato.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Admissão *</Label>
                <Input
                  type="date"
                  value={form.data_admissao}
                  onChange={(e) => handleChange("data_admissao", e.target.value)}
                />
              </div>
              <div>
                <Label>Salário Base *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.salario_base}
                  onChange={(e) => handleChange("salario_base", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Jornada de Trabalho</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Entrada</Label>
                  <Input
                    type="time"
                    value={form.jornada_entrada || "08:00"}
                    onChange={(e) => handleChange("jornada_entrada", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Saída Almoço</Label>
                  <Input
                    type="time"
                    value={form.jornada_saida_almoco || "12:00"}
                    onChange={(e) => handleChange("jornada_saida_almoco", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Entrada Tarde</Label>
                  <Input
                    type="time"
                    value={form.jornada_entrada_tarde || "13:00"}
                    onChange={(e) => handleChange("jornada_entrada_tarde", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Saída</Label>
                  <Input
                    type="time"
                    value={form.jornada_saida || "18:00"}
                    onChange={(e) => handleChange("jornada_saida", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bancarios" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Banco</Label>
                <Select value={form.banco || ""} onValueChange={(v) => handleChange("banco", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  value={form.agencia || ""}
                  onChange={(e) => handleChange("agencia", e.target.value)}
                  placeholder="0000"
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  value={form.conta || ""}
                  onChange={(e) => handleChange("conta", e.target.value)}
                  placeholder="00000-0"
                />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta || "corrente"} onValueChange={(v) => handleChange("tipo_conta", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">PIX (Preferencial)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Chave</Label>
                  <Select value={form.pix_tipo || ""} onValueChange={(v) => handleChange("pix_tipo", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chave PIX</Label>
                  <Input
                    value={form.pix_chave || ""}
                    onChange={(e) => handleChange("pix_chave", e.target.value)}
                    placeholder="Digite a chave PIX"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="beneficios" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Vale Transporte</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.vale_transporte || 0}
                  onChange={(e) => handleChange("vale_transporte", e.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor mensal</p>
              </div>
              <div>
                <Label>Vale Refeição</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.vale_refeicao || 0}
                  onChange={(e) => handleChange("vale_refeicao", e.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor mensal</p>
              </div>
              <div>
                <Label>Plano de Saúde</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.plano_saude || 0}
                  onChange={(e) => handleChange("plano_saude", e.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor mensal</p>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Outros Benefícios</h4>
                <Button variant="outline" size="sm" onClick={handleAddBeneficio}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              {(form.outros_beneficios || []).map((ben, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome do benefício"
                    value={ben.nome}
                    onChange={(e) => handleUpdateBeneficio(index, "nome", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Valor"
                    value={ben.valor}
                    onChange={(e) => handleUpdateBeneficio(index, "valor", Number(e.target.value))}
                    className="w-28"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ben.desconta}
                      onCheckedChange={(v) => handleUpdateBeneficio(index, "desconta", v)}
                    />
                    <span className="text-xs text-muted-foreground">Desconta?</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveBeneficio(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes || ""}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Observações gerais sobre o funcionário"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : funcionario?.id ? "Salvar Alterações" : "Cadastrar Funcionário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
