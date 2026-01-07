import { useState } from "react";
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Settings, 
  FileText, 
  MessageSquare, 
  Target,
  Bell,
  Shield,
  Building,
  Palette,
  Users,
  Key,
  History,
  Store,
  Clock,
  Image,
  Receipt,
  Scissors,
  Package,
  DollarSign,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  EyeOff,
  Mail,
  Phone,
  Share2,
  Printer,
  Tablet,
  BarChart3,
  Globe,
  Smartphone,
  Info,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowLeft,
  Camera
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Backup components
import BackupManual from "@/components/configuracoes/backup/BackupManual";
import BackupAutomatico from "@/components/configuracoes/backup/BackupAutomatico";
import RestaurarBackup from "@/components/configuracoes/backup/RestaurarBackup";
import ImportarDados from "@/components/configuracoes/backup/ImportarDados";
import ExportarDados from "@/components/configuracoes/backup/ExportarDados";
import LimparDados from "@/components/configuracoes/backup/LimparDados";
import WebcamConfig from "@/components/configuracoes/WebcamConfig";

type SubItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  route?: string;
  danger?: boolean;
};

type MenuSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SubItem[];
};

const menuSections: MenuSection[] = [
  {
    id: "geral",
    title: "Geral",
    icon: Settings,
    items: [
      { id: "preferencias", label: "Preferências", icon: Settings },
      { id: "aparencia", label: "Aparência", icon: Palette },
      { id: "notificacoes", label: "Notificações", icon: Bell },
    ],
  },
  {
    id: "usuarios",
    title: "Usuários e Acesso",
    icon: Users,
    items: [
      { id: "controle-acesso", label: "Controle de Acesso", icon: Shield },
      { id: "permissoes", label: "Permissões", icon: Key },
      { id: "minha-senha", label: "Minha Senha", icon: Key },
      { id: "usuarios-cadastrados", label: "Usuários Cadastrados", icon: Users, route: "/usuarios" },
      { id: "logs-acesso", label: "Logs de Acesso", icon: History },
    ],
  },
  {
    id: "backup",
    title: "Backup e Dados",
    icon: Database,
    items: [
      { id: "backup-manual", label: "Backup Manual", icon: Download },
      { id: "backup-automatico", label: "Backup Automático", icon: RefreshCw },
      { id: "restaurar", label: "Restaurar Backup", icon: Upload },
      { id: "exportar", label: "Exportar Dados", icon: Download },
      { id: "importar", label: "Importar Dados", icon: Database },
      { id: "limpar", label: "Limpar/Zerar Dados", icon: Trash2, danger: true },
    ],
  },
  {
    id: "salao",
    title: "Salão",
    icon: Store,
    items: [
      { id: "dados-salao", label: "Dados do Salão", icon: Building },
      { id: "horarios-funcionamento", label: "Horários Funcionamento", icon: Clock },
      { id: "imagens-logo", label: "Imagens/Logo", icon: Image },
      { id: "informacoes-fiscais", label: "Informações Fiscais", icon: Receipt, route: "/configuracoes/fiscal" },
    ],
  },
  {
    id: "servicos",
    title: "Serviços",
    icon: Scissors,
    items: [
      { id: "categorias-servicos", label: "Categorias", icon: Layers },
      { id: "lista-servicos", label: "Lista de Serviços", icon: Scissors, route: "/servicos" },
      { id: "pacotes-combos", label: "Pacotes/Combos", icon: Package },
      { id: "apenas-agenda", label: "Apenas Agenda", icon: EyeOff },
    ],
  },
  {
    id: "produtos",
    title: "Produtos",
    icon: Package,
    items: [
      { id: "categorias-produtos", label: "Categorias", icon: Layers },
      { id: "lista-produtos", label: "Lista de Produtos", icon: Package, route: "/produtos" },
      { id: "fornecedores", label: "Fornecedores", icon: Store },
      { id: "unidades-medida", label: "Unidades de Medida", icon: Package },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    items: [
      { id: "formas-pagamento", label: "Formas de Pagamento", icon: CreditCard },
      { id: "categorias-despesas", label: "Categorias Despesas", icon: PiggyBank },
      { id: "contas-bancarias", label: "Contas Bancárias", icon: DollarSign },
      { id: "metas", label: "Metas", icon: Target, route: "/configuracoes/metas" },
      { id: "comissoes", label: "Comissões", icon: Percent },
    ],
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: Calendar,
    items: [
      { id: "horarios-disponiveis", label: "Horários Disponíveis", icon: Clock },
      { id: "intervalos", label: "Intervalos", icon: Clock },
      { id: "cores-visualizacao", label: "Cores e Visualização", icon: Palette },
      { id: "lembretes", label: "Lembretes", icon: Bell },
      { id: "bloqueios", label: "Bloqueios", icon: EyeOff },
    ],
  },
  {
    id: "caixa-pdv",
    title: "Caixa/PDV",
    icon: CreditCard,
    items: [
      { id: "config-caixa", label: "Configurações Caixa", icon: CreditCard },
      { id: "webcam", label: "Webcam", icon: Camera },
      { id: "impressora-cupom", label: "Impressora/Cupom", icon: Printer },
      { id: "tablet-ponto", label: "Tablet (ponto)", icon: Tablet },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: BarChart3,
    items: [
      { id: "email-automatico", label: "Email Automático", icon: Mail },
      { id: "formatos-padrao", label: "Formatos Padrão", icon: FileText },
      { id: "logo-relatorios", label: "Logo Relatórios", icon: Image },
    ],
  },
  {
    id: "integracoes",
    title: "Integrações",
    icon: Share2,
    items: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, route: "/configuracoes/whatsapp" },
      { id: "email-integracao", label: "Email", icon: Mail },
      { id: "sms", label: "SMS", icon: Phone },
      { id: "google-calendar", label: "Google Calendar", icon: Calendar },
      { id: "redes-sociais", label: "Redes Sociais", icon: Globe },
    ],
  },
  {
    id: "notificacoes-sistema",
    title: "Notificações",
    icon: Bell,
    items: [
      { id: "lembretes-clientes", label: "Lembretes Clientes", icon: Bell },
      { id: "alertas-funcionarios", label: "Alertas Funcionários", icon: Bell },
      { id: "notificacoes-push", label: "Notificações Push", icon: Smartphone },
    ],
  },
  {
    id: "personalizacao",
    title: "Personalização",
    icon: Palette,
    items: [
      { id: "tema-cores", label: "Tema/Cores", icon: Palette },
      { id: "logo-sistema", label: "Logo do Sistema", icon: Image },
      { id: "tela-login", label: "Tela de Login", icon: Globe },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    icon: Settings,
    items: [
      { id: "informacoes", label: "Informações", icon: Info },
      { id: "licenca", label: "Licença", icon: Key },
      { id: "atualizacoes", label: "Atualizações", icon: RefreshCw },
      { id: "logs-sistema", label: "Logs do Sistema", icon: History },
      { id: "modo-dev", label: "Modo Desenvolvedor", icon: Settings },
    ],
  },
  {
    id: "sobre",
    title: "Sobre",
    icon: Info,
    items: [
      { id: "versao", label: "Versão", icon: Info },
      { id: "suporte", label: "Suporte", icon: HelpCircle },
      { id: "documentacao", label: "Documentação", icon: FileText },
    ],
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [selectedItem, setSelectedItem] = useState("backup-manual");
  const [expandedSections, setExpandedSections] = useState<string[]>(["backup"]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleMenuClick = (item: SubItem, sectionId: string) => {
    if (item.route) {
      navigate(item.route);
    } else {
      setSelectedItem(item.id);
      if (!expandedSections.includes(sectionId)) {
        setExpandedSections(prev => [...prev, sectionId]);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Filter sections based on search
  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => 
    section.items.length > 0 || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (selectedItem) {
      case "backup-manual":
        return <BackupManual />;
      case "backup-automatico":
        return <BackupAutomatico />;
      case "restaurar":
        return <RestaurarBackup />;
      case "importar":
        return <ImportarDados />;
      case "exportar":
        return <ExportarDados />;
      case "limpar":
        return <LimparDados />;
      case "preferencias":
        return <PreferenciasContent />;
      case "aparencia":
        return <AparenciaContent />;
      case "dados-salao":
        return <DadosSalaoContent />;
      case "informacoes":
        return <InformacoesContent />;
      case "licenca":
        return <LicencaContent />;
      case "atualizacoes":
        return <AtualizacoesContent />;
      case "logs-sistema":
        return <LogsSistemaContent />;
      case "modo-dev":
        return <ModoDevContent />;
      case "versao":
        return <SobreContent />;
      case "webcam":
        return <WebcamConfig />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Seção em Construção</p>
              <p className="text-sm">Esta configuração estará disponível em breve</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do Sistema
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as configurações do sistema
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Menu Lateral */}
        <Card className="w-72 flex-shrink-0">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar configuração..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-280px)]">
            <nav className="p-4 space-y-2">
              {filteredSections.map((section) => {
                const SectionIcon = section.icon;
                const isExpanded = expandedSections.includes(section.id);
                
                return (
                  <div key={section.id}>
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <SectionIcon className="h-4 w-4 text-primary" />
                        <span>{section.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    
                    {/* Section Items */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = selectedItem === item.id;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleMenuClick(item, section.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : item.danger
                                  ? "text-destructive hover:bg-destructive/10"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {ItemIcon && <ItemIcon className="h-4 w-4" />}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Sair */}
              <div className="pt-4 border-t mt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </nav>
          </ScrollArea>
        </Card>

        {/* Conteúdo */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Componente de Preferências
function PreferenciasContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Preferências Gerais
      </h2>
      
      <div className="space-y-6">
        {/* Idioma e Região */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Idioma e Região</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Idioma do Sistema</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>Português (BR)</option>
                <option>English (US)</option>
                <option>Español</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Formato de Data</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="dateFormat" defaultChecked /> DD/MM/YYYY
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="dateFormat" /> MM/DD/YYYY
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="dateFormat" /> YYYY-MM-DD
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Formato de Hora</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="timeFormat" defaultChecked /> 24 horas (14:30)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="timeFormat" /> 12 horas (2:30 PM)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Inicialização */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Inicialização</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Página Inicial ao Abrir</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>Dashboard</option>
                <option>Agenda</option>
                <option>Caixa</option>
                <option>Clientes</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Abrir em tela cheia
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Lembrar última página aberta
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Mostrar tutorial para novos usuários
              </label>
            </div>
          </div>
        </div>

        {/* Comportamento */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Comportamento</h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Confirmar antes de excluir
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Confirmar antes de cancelar agendamento
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Confirmar antes de fechar caixa
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Timeout de Sessão</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" defaultValue="30" className="w-20 p-2 border rounded-lg" />
                <span className="text-sm text-muted-foreground">minutos de inatividade</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Preferências</Button>
          <Button variant="outline">Restaurar Padrão</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente de Aparência
function AparenciaContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Palette className="h-5 w-5" />
        Aparência e Tema
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium">Tema</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="theme" defaultChecked /> Claro
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="theme" /> Escuro
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="theme" /> Auto (sistema)
            </label>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Cores Principais</h3>
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-40">Cor Primária:</label>
              <input type="color" defaultValue="#007AFF" className="h-10 w-20 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-40">Cor Secundária:</label>
              <input type="color" defaultValue="#34C759" className="h-10 w-20 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-40">Cor de Destaque:</label>
              <input type="color" defaultValue="#FF3B30" className="h-10 w-20 rounded" />
            </div>
          </div>
          <Button variant="outline" size="sm">Restaurar Cores Padrão</Button>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Personalização</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente de Dados do Salão
function DadosSalaoContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Building className="h-5 w-5" />
        Dados do Salão
      </h2>
      
      <div className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informações Básicas</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Nome do Salão *</label>
              <Input defaultValue="Maicon Maksuel Gestão de Salão" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Nome Fantasia</label>
              <Input defaultValue="Salão Maicon" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">CNPJ</label>
                <Input placeholder="00.000.000/0001-00" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Inscrição Estadual</label>
                <Input className="mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Endereço</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">CEP</label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="00000-000" />
                  <Button variant="outline" size="sm">Buscar</Button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Rua/Avenida</label>
              <Input className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Número</label>
                <Input className="mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Complemento</label>
                <Input className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Bairro</label>
                <Input className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <select className="w-full mt-1 p-2 border rounded-lg">
                  <option>MG</option>
                  <option>SP</option>
                  <option>RJ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium">Contato</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefone Principal</label>
                <Input placeholder="(00) 00000-0000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">WhatsApp Business</label>
                <Input placeholder="(00) 00000-0000" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="contato@salao.com.br" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <Input placeholder="@seu_salao" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Facebook</label>
                <Input placeholder="/seu_salao" className="mt-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Alterações</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente de Informações do Sistema
function InformacoesContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Info className="h-5 w-5" />
        Informações do Sistema
      </h2>
      
      <div className="space-y-6">
        {/* Software */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h3 className="font-medium">Software</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Nome:</span>
            <span>Maicon Maksuel Gestão de Salão</span>
            <span className="text-muted-foreground">Versão:</span>
            <span>2.0.5</span>
            <span className="text-muted-foreground">Build:</span>
            <span>20241229</span>
            <span className="text-muted-foreground">Licença:</span>
            <span className="text-green-600">Ativa</span>
          </div>
          <Button variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Atualizações
          </Button>
        </div>

        {/* Banco de Dados */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h3 className="font-medium">Banco de Dados</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Tipo:</span>
            <span>Cloud (Supabase)</span>
            <span className="text-muted-foreground">Status:</span>
            <span className="text-green-600">Conectado</span>
          </div>
        </div>

        {/* Limpar Cache */}
        <div className="p-4 border rounded-lg space-y-2">
          <h3 className="font-medium">Limpar Cache</h3>
          <p className="text-sm text-muted-foreground">
            Limpa dados temporários para melhorar performance
          </p>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Licença
function LicencaContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Key className="h-5 w-5" />
        Licença do Sistema
      </h2>
      
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">Licença Ativa</p>
              <p className="text-sm text-green-600 dark:text-green-500">Seu sistema está licenciado e funcionando corretamente</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Detalhes da Licença</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Tipo:</span>
            <span>Profissional</span>
            <span className="text-muted-foreground">Código:</span>
            <span className="font-mono">XXXX-XXXX-XXXX-XXXX</span>
            <span className="text-muted-foreground">Validade:</span>
            <span>31/12/2025</span>
            <span className="text-muted-foreground">Usuários:</span>
            <span>Ilimitados</span>
            <span className="text-muted-foreground">Profissionais:</span>
            <span>Ilimitados</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-medium">Ativar Nova Licença</h3>
          <div className="flex gap-2">
            <Input placeholder="Digite o código da licença" className="font-mono" />
            <Button>Ativar</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Renovar Licença
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Atualizações
function AtualizacoesContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <RefreshCw className="h-5 w-5" />
        Atualizações do Sistema
      </h2>
      
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Sistema Atualizado</p>
                <p className="text-sm text-green-600 dark:text-green-500">Versão 2.0.5 - Última verificação: hoje às 10:30</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Agora
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Configurações de Atualização</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Atualização Automática</p>
                <p className="text-sm text-muted-foreground">Instalar atualizações automaticamente</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Notificar sobre Atualizações</p>
                <p className="text-sm text-muted-foreground">Receber notificações quando houver atualizações</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Incluir Versões Beta</p>
                <p className="text-sm text-muted-foreground">Receber versões de teste antes do lançamento</p>
              </div>
              <input type="checkbox" className="h-5 w-5" />
            </label>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Histórico de Atualizações</h3>
          <div className="space-y-2">
            {[
              { versao: "2.0.5", data: "28/12/2024", desc: "Correções de bugs e melhorias de performance" },
              { versao: "2.0.4", data: "15/12/2024", desc: "Nova tela de configurações" },
              { versao: "2.0.3", data: "01/12/2024", desc: "Integração com WhatsApp" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">v{item.versao}</span>
                  <span className="text-sm text-muted-foreground">{item.data}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Componente Logs do Sistema
function LogsSistemaContent() {
  const logs = [
    { tipo: "info", msg: "Sistema iniciado com sucesso", hora: "10:30:15" },
    { tipo: "success", msg: "Backup automático realizado", hora: "10:00:00" },
    { tipo: "warning", msg: "Tentativa de login com senha incorreta", hora: "09:45:22" },
    { tipo: "info", msg: "Usuário admin fez login", hora: "09:30:00" },
    { tipo: "success", msg: "Sincronização com servidor concluída", hora: "09:15:00" },
    { tipo: "info", msg: "Verificação de atualizações realizada", hora: "09:00:00" },
    { tipo: "error", msg: "Falha na conexão temporária - reconectado", hora: "08:45:30" },
    { tipo: "success", msg: "Caixa fechado corretamente", hora: "22:00:00" },
  ];

  const getLogColor = (tipo: string) => {
    switch (tipo) {
      case "success": return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "warning": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "error": return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default: return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <History className="h-5 w-5" />
        Logs do Sistema
      </h2>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <select className="p-2 border rounded-lg text-sm">
              <option>Todos os tipos</option>
              <option>Informação</option>
              <option>Sucesso</option>
              <option>Aviso</option>
              <option>Erro</option>
            </select>
            <Input placeholder="Buscar nos logs..." className="w-64" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Logs
            </Button>
          </div>
        </div>

        <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="p-3 flex items-center gap-3 hover:bg-muted/50">
              <span className={cn("px-2 py-1 rounded text-xs font-medium", getLogColor(log.tipo))}>
                {log.tipo.toUpperCase()}
              </span>
              <span className="flex-1">{log.msg}</span>
              <span className="text-sm text-muted-foreground font-mono">{log.hora}</span>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          Mostrando últimos 8 registros • Os logs são mantidos por 30 dias
        </div>
      </div>
    </Card>
  );
}

// Componente Modo Desenvolvedor
function ModoDevContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Modo Desenvolvedor
      </h2>
      
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400 text-sm">
            ⚠️ <strong>Atenção:</strong> Estas opções são destinadas a desenvolvedores e podem afetar o funcionamento do sistema.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Modo Debug</p>
              <p className="text-sm text-muted-foreground">Exibir informações de debug no console</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Mostrar IDs</p>
              <p className="text-sm text-muted-foreground">Exibir IDs dos registros na interface</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Desabilitar Cache</p>
              <p className="text-sm text-muted-foreground">Não usar cache para requisições</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Logs Detalhados</p>
              <p className="text-sm text-muted-foreground">Registrar logs detalhados de todas as operações</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Ferramentas de Desenvolvedor</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Ver Estrutura DB
            </Button>
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              Ver Requisições API
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar Tipos
            </Button>
            <Button variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Storage
            </Button>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Informações Técnicas</h3>
          <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm space-y-1">
            <p><span className="text-muted-foreground">Ambiente:</span> Produção</p>
            <p><span className="text-muted-foreground">Build:</span> 20241229</p>
            <p><span className="text-muted-foreground">React:</span> 18.3.1</p>
            <p><span className="text-muted-foreground">Backend:</span> Lovable Cloud</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Componente Sobre
function SobreContent() {
  return (
    <Card className="p-6">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
          <Settings className="h-12 w-12 text-primary" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold">Maicon Maksuel Gestão de Salão</h2>
          <p className="text-muted-foreground">Versão 2.0.5</p>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          Sistema completo de gestão para salões de beleza
        </p>

        <div className="border-t pt-6 space-y-2 text-sm">
          <p><strong>📧 Suporte:</strong> suporte@salao.com</p>
          <p><strong>📱 WhatsApp:</strong> (35) 99999-9999</p>
          <p><strong>🌐 Site:</strong> www.salao.com.br</p>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Documentação
          </Button>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat Suporte
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4 border-t">
          © 2024 Maicon Maksuel - Todos os direitos reservados
        </p>
      </div>
    </Card>
  );
}