/**
 * Dados do Salão Settings Component
 * Manages salon identity, contact info, and logo with global propagation
 */

import { useState, useRef, useEffect } from "react";
import { Building, Upload, Image, Phone, Mail, Globe, MapPin, Save, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSalonData } from "@/contexts/SalonSettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DadosSalaoSettings() {
  const { salonData, updateSalonData, uploadLogo, isLoading } = useSalonData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome_salao: salonData?.nome_salao || '',
    nome_fantasia: salonData?.nome_fantasia || '',
    telefone_principal: salonData?.telefone_principal || '',
    whatsapp: salonData?.whatsapp || '',
    email: salonData?.email || '',
    instagram: salonData?.instagram || '',
    facebook: salonData?.facebook || '',
    site: salonData?.site || '',
    cnpj: salonData?.cnpj || '',
    inscricao_estadual: salonData?.inscricao_estadual || '',
    inscricao_municipal: salonData?.inscricao_municipal || '',
    endereco_cep: salonData?.endereco_cep || '',
    endereco_logradouro: salonData?.endereco_logradouro || '',
    endereco_numero: salonData?.endereco_numero || '',
    endereco_complemento: salonData?.endereco_complemento || '',
    endereco_bairro: salonData?.endereco_bairro || '',
    endereco_cidade: salonData?.endereco_cidade || '',
    endereco_estado: salonData?.endereco_estado || '',
  });

  // Update form when data loads
  useEffect(() => {
    if (salonData) {
      setFormData({
        nome_salao: salonData.nome_salao || '',
        nome_fantasia: salonData.nome_fantasia || '',
        telefone_principal: salonData.telefone_principal || '',
        whatsapp: salonData.whatsapp || '',
        email: salonData.email || '',
        instagram: salonData.instagram || '',
        facebook: salonData.facebook || '',
        site: salonData.site || '',
        cnpj: salonData.cnpj || '',
        inscricao_estadual: salonData.inscricao_estadual || '',
        inscricao_municipal: salonData.inscricao_municipal || '',
        endereco_cep: salonData.endereco_cep || '',
        endereco_logradouro: salonData.endereco_logradouro || '',
        endereco_numero: salonData.endereco_numero || '',
        endereco_complemento: salonData.endereco_complemento || '',
        endereco_bairro: salonData.endereco_bairro || '',
        endereco_cidade: salonData.endereco_cidade || '',
        endereco_estado: salonData.endereco_estado || '',
      });
    }
  }, [salonData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome_salao.trim()) {
      toast.error('Nome do salão é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await updateSalonData(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCepSearch = async () => {
    const cep = formData.endereco_cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        endereco_logradouro: data.logradouro || '',
        endereco_bairro: data.bairro || '',
        endereco_cidade: data.localidade || '',
        endereco_estado: data.uf || '',
      }));
      toast.success('Endereço encontrado!');
    } catch {
      toast.error('Erro ao buscar CEP');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Building className="h-5 w-5" />
          Dados do Salão
        </h2>

        <div className="space-y-8">
          {/* Logo Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo do Salão
            </h3>
            <p className="text-sm text-muted-foreground">
              O logo será exibido na sidebar, cabeçalho, kiosk, relatórios e documentos impressos.
            </p>

            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className={cn(
                "w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
                "bg-muted/50 transition-colors",
                salonData?.logo_url ? "border-primary/30" : "border-muted-foreground/30"
              )}>
                {salonData?.logo_url ? (
                  <img 
                    src={salonData.logo_url} 
                    alt="Logo do Salão"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Sem logo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {salonData?.logo_url ? 'Alterar Logo' : 'Enviar Logo'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG. Máximo 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            <div className="grid gap-4">
              <div>
                <Label>Nome do Salão *</Label>
                <Input
                  value={formData.nome_salao}
                  onChange={(e) => handleInputChange('nome_salao', e.target.value)}
                  placeholder="Nome completo do salão"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                  placeholder="Nome comercial"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Inscrição Estadual</Label>
                  <Input
                    value={formData.inscricao_estadual}
                    onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contato
            </h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone Principal</Label>
                  <Input
                    value={formData.telefone_principal}
                    onChange={(e) => handleInputChange('telefone_principal', e.target.value)}
                    placeholder="(00) 0000-0000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>WhatsApp Business</Label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@salao.com.br"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="@seu_salao"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input
                    value={formData.facebook}
                    onChange={(e) => handleInputChange('facebook', e.target.value)}
                    placeholder="/seu_salao"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Site
                </Label>
                <Input
                  value={formData.site}
                  onChange={(e) => handleInputChange('site', e.target.value)}
                  placeholder="https://www.seusalao.com.br"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label>CEP</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={formData.endereco_cep}
                      onChange={(e) => handleInputChange('endereco_cep', e.target.value)}
                      placeholder="00000-000"
                    />
                    <Button variant="outline" size="icon" onClick={handleCepSearch}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label>Rua/Avenida</Label>
                <Input
                  value={formData.endereco_logradouro}
                  onChange={(e) => handleInputChange('endereco_logradouro', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Número</Label>
                  <Input
                    value={formData.endereco_numero}
                    onChange={(e) => handleInputChange('endereco_numero', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    value={formData.endereco_complemento}
                    onChange={(e) => handleInputChange('endereco_complemento', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={formData.endereco_bairro}
                    onChange={(e) => handleInputChange('endereco_bairro', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.endereco_cidade}
                    onChange={(e) => handleInputChange('endereco_cidade', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <select
                    value={formData.endereco_estado}
                    onChange={(e) => handleInputChange('endereco_estado', e.target.value)}
                    className="w-full mt-1 h-11 px-3 rounded-ios-md border-2 border-transparent bg-secondary"
                  >
                    <option value="">Selecione</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
