import { useState, useEffect } from "react";
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
  Camera,
  Plus,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { supabase } from "@/integrations/supabase/client";

// Backup components
import BackupManual from "@/components/configuracoes/backup/BackupManual";
import BackupAutomatico from "@/components/configuracoes/backup/BackupAutomatico";
import RestaurarBackup from "@/components/configuracoes/backup/RestaurarBackup";
import ImportarDados from "@/components/configuracoes/backup/ImportarDados";
import ExportarDados from "@/components/configuracoes/backup/ExportarDados";
import LimparDados from "@/components/configuracoes/backup/LimparDados";
import WebcamConfig from "@/components/configuracoes/WebcamConfig";
import DiagnosticoSistema from "@/components/configuracoes/DiagnosticoSistema";
import ControleAcesso from "@/components/configuracoes/ControleAcesso";
// New settings components
import CaixaSettings from "@/components/configuracoes/CaixaSettings";
import AgendaSettings from "@/components/configuracoes/AgendaSettings";
import ServicosProdutosSettings from "@/components/configuracoes/ServicosProdutosSettings";
import DispositivosSettings from "@/components/configuracoes/DispositivosSettings";
import SistemaInfo from "@/components/configuracoes/SistemaInfo";
import KioskModeSettings from "@/components/configuracoes/kiosk/KioskModeSettings";
// General settings components
import DadosSalaoSettings from "@/components/configuracoes/geral/DadosSalaoSettings";
import AparenciaSettings from "@/components/configuracoes/geral/AparenciaSettings";
import NotificacoesSettings from "@/components/configuracoes/geral/NotificacoesSettings";
// RH Settings
import RHSettings from "@/components/configuracoes/RHSettings";
import AppErrorsDiagnostic from "@/components/configuracoes/AppErrorsDiagnostic";
import GeminiApiSettings from "@/components/configuracoes/GeminiApiSettings";
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
      { id: "controle-acesso", label: "Usuários e Acesso", icon: Shield },
    ],
  },
  {
    id: "rh",
    title: "Recursos Humanos",
    icon: Users,
    items: [
      { id: "config-rh", label: "Configurações RH", icon: Settings },
      { id: "jornada-ponto", label: "Jornada e Ponto", icon: Clock },
      { id: "comissoes-rh", label: "Regras de Comissão", icon: Percent },
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
      { id: "taxa-falta", label: "Taxa de Falta", icon: DollarSign, route: "/configuracoes/taxa-falta" },
    ],
  },
  {
    id: "caixa-pdv",
    title: "Caixa/PDV",
    icon: CreditCard,
    items: [
      { id: "config-caixa", label: "Configurações Caixa", icon: CreditCard, route: "/configuracoes/caixa-pdv" },
      { id: "webcam", label: "Webcam", icon: Camera, route: "/configuracoes/caixa-pdv" },
      { id: "impressora-cupom", label: "Impressora/Cupom", icon: Printer, route: "/configuracoes/caixa-pdv" },
      { id: "tablet-ponto", label: "Tablet (ponto)", icon: Tablet, route: "/configuracoes/caixa-pdv" },
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
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, route: "/configuracoes/integracoes" },
      { id: "email-integracao", label: "Email", icon: Mail, route: "/configuracoes/integracoes" },
      { id: "sms", label: "SMS", icon: Phone, route: "/configuracoes/integracoes" },
      { id: "google-calendar", label: "Google Calendar", icon: Calendar, route: "/configuracoes/integracoes" },
      { id: "redes-sociais", label: "Redes Sociais", icon: Globe, route: "/configuracoes/integracoes" },
      { id: "apis-ia", label: "APIs de IA (Gemini)", icon: Sparkles },
    ],
  },
  {
    id: "notificacoes-sistema",
    title: "Notificações",
    icon: Bell,
    items: [
      { id: "lembretes-clientes", label: "Lembretes Clientes", icon: Bell, route: "/configuracoes/notificacoes" },
      { id: "alertas-funcionarios", label: "Alertas Funcionários", icon: Bell, route: "/configuracoes/notificacoes" },
      { id: "notificacoes-push", label: "Notificações Push", icon: Smartphone, route: "/configuracoes/notificacoes" },
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
    id: "kiosk",
    title: "Modo Kiosk",
    icon: Tablet,
    items: [
      { id: "kiosk-config", label: "Configuração Kiosk", icon: Tablet },
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
      { id: "diagnostico", label: "Diagnóstico", icon: Database },
      { id: "erros-app", label: "Erros do App", icon: HelpCircle },
      { id: "mapa-sistema", label: "Mapa do Sistema", icon: Globe, route: "/mapa-sistema" },
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
  const { logout, session } = usePinAuth();
  const [selectedItem, setSelectedItem] = useState("backup-manual");
  const [expandedSections, setExpandedSections] = useState<string[]>(["backup"]);
  const [searchQuery, setSearchQuery] = useState("");

  // Only admin can access system settings
  if (session && session.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <Settings className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Apenas administradores podem acessar as configurações do sistema.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

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

  const handleSignOut = () => {
    logout();
    navigate("/");
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
      case "controle-acesso":
        return <ControleAcesso />;
      case "preferencias":
        return <PreferenciasContent />;
      case "aparencia":
        return <AparenciaSettings />;
      case "notificacoes":
        return <NotificacoesSettings />;
      case "dados-salao":
        return <DadosSalaoSettings />;
      case "horarios-funcionamento":
        return <HorariosFuncionamentoContent />;
      case "imagens-logo":
        return <ImagensLogoContent />;
      case "informacoes":
        return <SistemaInfo />;
      case "licenca":
        return <LicencaContent />;
      case "atualizacoes":
        return <AtualizacoesContent />;
      case "logs-sistema":
        return <LogsSistemaContent />;
      case "modo-dev":
        return <ModoDevContent />;
      case "diagnostico":
        return <DiagnosticoSistema />;
      case "erros-app":
        return <AppErrorsDiagnostic />;
      case "versao":
        return <SistemaInfo />;
      case "webcam":
        return <WebcamConfig />;
      case "tema-cores":
        return <TemasCoresContent />;
      case "logo-sistema":
        return <LogoSistemaContent />;
      case "tela-login":
        return <TelaLoginContent />;
      case "categorias-servicos":
        return <CategoriasServicosContent />;
      case "pacotes-combos":
        return <PacotesCombosContent />;
      case "apenas-agenda":
        return <ApenasAgendaContent />;
      case "formas-pagamento":
        return <FormasPagamentoContent />;
      case "categorias-despesas":
        return <CategoriasDespesasContent />;
      case "contas-bancarias":
        return <ContasBancariasContent />;
      case "comissoes":
        return <ServicosProdutosSettings />;
      case "categorias-produtos":
        return <CategoriasProdutosContent />;
      case "fornecedores":
        return <FornecedoresContent />;
      case "unidades-medida":
        return <UnidadesMedidaContent />;
      case "horarios-disponiveis":
        return <AgendaSettings />;
      case "intervalos":
        return <AgendaSettings />;
      case "cores-visualizacao":
        return <CoresVisualizacaoContent />;
      case "lembretes":
        return <LembretesContent />;
      case "bloqueios":
        return <BloqueiosContent />;
      case "config-caixa":
        return <CaixaSettings />;
      case "tablet-ponto":
        return <DispositivosSettings />;
      case "kiosk-config":
        return <KioskModeSettings />;
      case "config-rh":
      case "jornada-ponto":
      case "comissoes-rh":
        return <RHSettings />;
      case "apis-ia":
        return <GeminiApiSettings />;
      case "email-automatico":
        return <EmailAutomaticoContent />;
      case "formatos-padrao":
        return <FormatosPadraoContent />;
      case "logo-relatorios":
        return <LogoRelatoriosContent />;
      case "suporte":
        return <SuporteContent />;
      case "documentacao":
        return <DocumentacaoContent />;
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
        {/* Menu Lateral - hidden on mobile, shown via button */}
        <Card className="hidden md:flex w-72 flex-shrink-0 max-h-[calc(100vh-180px)] flex-col sticky top-6 overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
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

          <ScrollArea className="flex-1 min-h-0">
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

        {/* Mobile Menu */}
        <div className="md:hidden w-full">
          <select
            value={selectedItem}
            onChange={(e) => {
              const item = menuSections.flatMap(s => s.items).find(i => i.id === e.target.value);
              if (item?.route) {
                navigate(item.route);
              } else {
                setSelectedItem(e.target.value);
              }
            }}
            className="w-full p-3 border rounded-lg bg-background mb-4 text-sm"
          >
            {menuSections.map(section => (
              <optgroup key={section.id} label={section.title}>
                {section.items.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Componente de Preferências
function PreferenciasContent() {
  const [rememberRoute, setRememberRoute] = useState(() => {
    return localStorage.getItem("rememberLastRoute") === "true";
  });

  const handleToggleRemember = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberRoute(checked);
    localStorage.setItem("rememberLastRoute", checked ? "true" : "false");
  };

  return (
    <div className="space-y-6">
      <DadosSalaoSettings />
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Inicialização</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberRoute}
              onChange={handleToggleRemember}
            />
            Lembrar última tela ao reiniciar
          </label>
          <p className="text-xs text-muted-foreground ml-6">
            Ao reabrir o app, volta para a tela onde você parou (funciona no Kiosk e no Admin)
          </p>
        </div>
      </Card>
    </div>
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
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'uptodate' | 'available' | 'downloading' | 'ready' | 'error'>('uptodate');
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isElectronEnv = typeof window !== 'undefined' && window.electron?.isElectron === true;

  useEffect(() => {
    if (!isElectronEnv || !window.electron) return;
    const electron = window.electron;

    electron.onUpdateAvailable((info) => {
      setUpdateStatus('available');
      setUpdateVersion(info.version);
      setChecking(false);
    });
    electron.onUpdateProgress((p) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.round(p.percent));
    });
    electron.onUpdateDownloaded(() => {
      setUpdateStatus('ready');
      setDownloadProgress(100);
    });
    electron.onUpdateError((err) => {
      setUpdateStatus('error');
      setErrorMsg(String(err));
      setChecking(false);
    });

    return () => { electron.removeUpdateListeners(); };
  }, [isElectronEnv]);

  const handleCheck = async () => {
    setChecking(true);
    setUpdateStatus('uptodate');
    setErrorMsg('');
    setLastCheck(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    if (isElectronEnv && window.electron) {
      toast.info('Verificando atualizações...');
      try {
        await window.electron.checkForUpdates();
      } catch (e) {
        setUpdateStatus('error');
        setErrorMsg(String(e));
        setChecking(false);
        return;
      }
      // If no update found after 8s, show "up to date"
      setTimeout(() => {
        setChecking(prev => {
          if (prev) {
            toast.success('Sistema já está atualizado!');
          }
          return false;
        });
      }, 8000);
    } else {
      // Web: attempt to update service worker cache
      toast.info('Verificando atualizações...');
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
          }
        }
      } catch (_e) { /* ignore */ }
      setTimeout(() => {
        setChecking(false);
        setUpdateStatus('uptodate');
        toast.success('Sistema atualizado! Você está usando a versão mais recente.');
      }, 2500);
    }
  };

  const handleDownload = async () => {
    if (!window.electron) return;
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    await window.electron.downloadUpdate();
  };

  const handleInstall = async () => {
    if (!window.electron) return;
    toast.success('Reiniciando para instalar atualização...');
    setTimeout(() => window.electron!.installUpdate(), 1000);
  };

  const statusConfig = {
    uptodate: { icon: Shield, label: 'Sistema Atualizado', color: 'green' },
    available: { icon: Download, label: `Nova versão disponível: v${updateVersion}`, color: 'blue' },
    downloading: { icon: Download, label: `Baixando atualização... ${downloadProgress}%`, color: 'blue' },
    ready: { icon: CheckCircle2, label: 'Atualização pronta para instalar', color: 'green' },
    error: { icon: AlertTriangle, label: 'Erro ao verificar atualizações', color: 'red' },
  };

  const s = statusConfig[updateStatus];
  const StatusIcon = s.icon;
  const bgClass = `bg-${s.color}-50 dark:bg-${s.color}-900/20 border-${s.color}-200 dark:border-${s.color}-800`;
  const textClass = `text-${s.color}-700 dark:text-${s.color}-400`;
  const subTextClass = `text-${s.color}-600 dark:text-${s.color}-500`;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <RefreshCw className="h-5 w-5" />
        Atualizações do Sistema
      </h2>

      <div className="space-y-6">
        <div className={`p-4 border rounded-lg ${bgClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 bg-${s.color}-500 rounded-full flex items-center justify-center`}>
                <StatusIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`font-semibold ${textClass}`}>{s.label}</p>
                <p className={`text-sm ${subTextClass}`}>
                  {lastCheck ? `Última verificação: hoje às ${lastCheck}` : 'Clique em Verificar para checar atualizações'}
                </p>
                {updateStatus === 'error' && errorMsg && (
                  <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {updateStatus === 'available' && isElectronEnv && (
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              )}
              {updateStatus === 'ready' && isElectronEnv && (
                <Button size="sm" onClick={handleInstall} className="bg-green-600 hover:bg-green-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Instalar e Reiniciar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleCheck} disabled={checking || updateStatus === 'downloading'}>
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Verificando...' : 'Verificar Agora'}
              </Button>
            </div>
          </div>
          {updateStatus === 'downloading' && (
            <div className="mt-3">
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}
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

// Componente Temas e Cores
function TemasCoresContent() {
  const temas = [
    { id: "light", nome: "Claro", desc: "Tema claro padrão", bg: "bg-white", text: "text-gray-900" },
    { id: "dark", nome: "Escuro", desc: "Tema escuro moderno", bg: "bg-gray-900", text: "text-white" },
    { id: "system", nome: "Sistema", desc: "Seguir preferência do sistema", bg: "bg-gradient-to-r from-white to-gray-900", text: "text-gray-600" },
  ];

  const cores = [
    { id: "blue", cor: "#3b82f6", nome: "Azul" },
    { id: "purple", cor: "#8b5cf6", nome: "Roxo" },
    { id: "pink", cor: "#ec4899", nome: "Rosa" },
    { id: "red", cor: "#ef4444", nome: "Vermelho" },
    { id: "orange", cor: "#f97316", nome: "Laranja" },
    { id: "green", cor: "#22c55e", nome: "Verde" },
    { id: "teal", cor: "#14b8a6", nome: "Turquesa" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Palette className="h-5 w-5" />
        Tema e Cores
      </h2>

      <div className="space-y-8">
        {/* Seleção de Tema */}
        <div className="space-y-4">
          <h3 className="font-medium">Tema do Sistema</h3>
          <div className="grid grid-cols-3 gap-4">
            {temas.map((tema) => (
              <label key={tema.id} className="cursor-pointer">
                <input type="radio" name="tema" defaultChecked={tema.id === "light"} className="sr-only peer" />
                <div className="border-2 rounded-lg p-4 peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                  <div className={cn("h-20 rounded-md mb-3", tema.bg, "border")} />
                  <p className="font-medium">{tema.nome}</p>
                  <p className="text-sm text-muted-foreground">{tema.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Cor Principal */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Cor Principal</h3>
          <div className="flex flex-wrap gap-3">
            {cores.map((cor) => (
              <label key={cor.id} className="cursor-pointer">
                <input type="radio" name="cor" defaultChecked={cor.id === "blue"} className="sr-only peer" />
                <div className="w-12 h-12 rounded-full border-4 border-transparent peer-checked:border-gray-400 transition-all flex items-center justify-center"
                  style={{ backgroundColor: cor.cor }}>
                </div>
                <p className="text-xs text-center mt-1">{cor.nome}</p>
              </label>
            ))}
            <label className="cursor-pointer">
              <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center">
                <input type="color" className="w-8 h-8 rounded cursor-pointer" />
              </div>
              <p className="text-xs text-center mt-1">Custom</p>
            </label>
          </div>
        </div>

        {/* Fonte */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Fonte do Sistema</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Família da Fonte</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>Inter (Padrão)</option>
                <option>Roboto</option>
                <option>Open Sans</option>
                <option>Poppins</option>
                <option>Montserrat</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tamanho Base</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>Pequeno (14px)</option>
                <option>Normal (16px)</option>
                <option>Grande (18px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bordas e Cantos */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Estilo dos Elementos</h3>
          <div>
            <label className="text-sm text-muted-foreground">Arredondamento de Bordas</label>
            <div className="flex items-center gap-4 mt-2">
              <input type="range" min="0" max="20" defaultValue="8" className="flex-1" />
              <div className="w-16 h-10 bg-primary rounded-lg" style={{ borderRadius: '8px' }} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Tema</Button>
          <Button variant="outline">Restaurar Padrão</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Logo do Sistema
function LogoSistemaContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Image className="h-5 w-5" />
        Logo do Sistema
      </h2>

      <div className="space-y-8">
        {/* Logo Principal */}
        <div className="space-y-4">
          <h3 className="font-medium">Logo Principal</h3>
          <p className="text-sm text-muted-foreground">Usado na barra lateral e cabeçalho do sistema</p>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">180x180px</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Carregar Logo
              </Button>
              <p className="text-xs text-muted-foreground">PNG ou SVG, máximo 2MB</p>
            </div>
          </div>
        </div>

        {/* Ícone/Favicon */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Ícone (Favicon)</h3>
          <p className="text-sm text-muted-foreground">Ícone exibido na aba do navegador</p>
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Image className="h-6 w-6 mx-auto text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Carregar Ícone
              </Button>
              <p className="text-xs text-muted-foreground">32x32px ou 64x64px</p>
            </div>
          </div>
        </div>

        {/* Logo para Impressão */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Logo para Impressão</h3>
          <p className="text-sm text-muted-foreground">Usado em cupons, relatórios e notas fiscais</p>
          <div className="flex items-start gap-6">
            <div className="w-48 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">300x150px</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Carregar Logo
              </Button>
              <p className="text-xs text-muted-foreground">PNG com fundo transparente</p>
            </div>
          </div>
        </div>

        {/* Texto do Cabeçalho */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Texto do Cabeçalho</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Nome exibido no sistema</label>
              <Input defaultValue="Maicon Maksuel Salão" className="mt-1" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span className="text-sm">Exibir nome ao lado do logo</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Alterações</Button>
          <Button variant="outline">Restaurar Padrão</Button>
        </div>
      </div>
    </Card>
  );
}


// Componente Horários de Funcionamento
function HorariosFuncionamentoContent() {
  const diasSemana = [
    { id: "dom", nome: "Domingo", aberto: false, inicio: "09:00", fim: "18:00" },
    { id: "seg", nome: "Segunda-feira", aberto: true, inicio: "09:00", fim: "19:00" },
    { id: "ter", nome: "Terça-feira", aberto: true, inicio: "09:00", fim: "19:00" },
    { id: "qua", nome: "Quarta-feira", aberto: true, inicio: "09:00", fim: "19:00" },
    { id: "qui", nome: "Quinta-feira", aberto: true, inicio: "09:00", fim: "19:00" },
    { id: "sex", nome: "Sexta-feira", aberto: true, inicio: "09:00", fim: "19:00" },
    { id: "sab", nome: "Sábado", aberto: true, inicio: "09:00", fim: "17:00" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Horários de Funcionamento
      </h2>

      <div className="space-y-6">
        {/* Horários por Dia */}
        <div className="space-y-4">
          <h3 className="font-medium">Horários por Dia da Semana</h3>
          <div className="space-y-3">
            {diasSemana.map((dia) => (
              <div key={dia.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <label className="flex items-center gap-2 w-40">
                  <input type="checkbox" defaultChecked={dia.aberto} className="h-4 w-4" />
                  <span className={dia.aberto ? "font-medium" : "text-muted-foreground"}>{dia.nome}</span>
                </label>
                <div className="flex items-center gap-2 flex-1">
                  <Input type="time" defaultValue={dia.inicio} className="w-28" disabled={!dia.aberto} />
                  <span className="text-muted-foreground">até</span>
                  <Input type="time" defaultValue={dia.fim} className="w-28" disabled={!dia.aberto} />
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  + Intervalo
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Horário de Almoço */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Horário de Almoço/Intervalo</h3>
          <div className="p-4 bg-muted/50 rounded-lg">
            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" className="h-4 w-4" />
              <span>Fechar para almoço</span>
            </label>
            <div className="flex items-center gap-2">
              <Input type="time" defaultValue="12:00" className="w-28" />
              <span className="text-muted-foreground">até</span>
              <Input type="time" defaultValue="13:00" className="w-28" />
            </div>
          </div>
        </div>

        {/* Feriados */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Feriados e Datas Especiais</h3>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Adicionar Feriado
            </Button>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              <span>Fechar em feriados nacionais</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span>Fechar em feriados estaduais</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span>Fechar em feriados municipais</span>
            </label>
          </div>
        </div>

        {/* Configurações Adicionais */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Configurações da Agenda</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Intervalo entre agendamentos</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>15 minutos</option>
                <option>30 minutos</option>
                <option>1 hora</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Antecedência mínima para agendar</label>
              <select className="w-full mt-1 p-2 border rounded-lg">
                <option>Sem limite</option>
                <option>1 hora</option>
                <option>2 horas</option>
                <option>24 horas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Horários</Button>
          <Button variant="outline">Restaurar Padrão</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Imagens/Logo do Salão
function ImagensLogoContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Image className="h-5 w-5" />
        Imagens e Logo do Salão
      </h2>

      <div className="space-y-8">
        {/* Logo Principal */}
        <div className="space-y-4">
          <h3 className="font-medium">Logo do Salão</h3>
          <p className="text-sm text-muted-foreground">Este logo será exibido em cupons, relatórios e materiais do salão</p>
          <div className="flex items-start gap-6">
            <div className="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Image className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">200x200px</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Carregar Logo
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
              <p className="text-xs text-muted-foreground">
                Formatos: PNG, JPG ou SVG<br />
                Tamanho máximo: 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Imagem do Salão */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Foto do Salão</h3>
          <p className="text-sm text-muted-foreground">Imagem principal que representa seu estabelecimento</p>
          <div className="flex items-start gap-6">
            <div className="w-64 h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Store className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">800x500px</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Carregar Foto
              </Button>
              <p className="text-xs text-muted-foreground">
                Recomendado: 800x500px ou proporcional<br />
                Formatos: PNG ou JPG
              </p>
            </div>
          </div>
        </div>

        {/* Banner WhatsApp */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Banner para WhatsApp</h3>
          <p className="text-sm text-muted-foreground">Imagem enviada nas mensagens de confirmação</p>
          <div className="flex items-start gap-6">
            <div className="w-64 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">600x300px</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Carregar Banner
              </Button>
            </div>
          </div>
        </div>

        {/* Galeria de Trabalhos */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Galeria de Trabalhos</h3>
              <p className="text-sm text-muted-foreground">Fotos de serviços realizados</p>
            </div>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Adicionar Fotos
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Imagens</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Tela de Login
function TelaLoginContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Globe className="h-5 w-5" />
        Personalização da Tela de Login
      </h2>

      <div className="space-y-8">
        {/* Preview */}
        <div className="space-y-4">
          <h3 className="font-medium">Pré-visualização</h3>
          <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="bg-background rounded-lg p-6 max-w-sm mx-auto shadow-lg">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-primary/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">Bem-vindo(a)</h3>
                <p className="text-xs text-muted-foreground">Maicon Maksuel Salão</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-primary rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Imagem de Fundo */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Imagem de Fundo</h3>
          <div className="grid grid-cols-4 gap-3">
            {["Gradiente Padrão", "Imagem 1", "Imagem 2", "Personalizado"].map((item, i) => (
              <label key={i} className="cursor-pointer">
                <input type="radio" name="bg" defaultChecked={i === 0} className="sr-only peer" />
                <div className="h-20 border-2 rounded-lg peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {i === 3 && <Upload className="h-5 w-5 text-muted-foreground" />}
                </div>
                <p className="text-xs text-center mt-1">{item}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Textos */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Textos da Tela</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Título de Boas-vindas</label>
              <Input defaultValue="Bem-vindo(a)" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Subtítulo</label>
              <Input defaultValue="Faça login para continuar" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Texto do Rodapé</label>
              <Input defaultValue="© 2024 Maicon Maksuel - Todos os direitos reservados" className="mt-1" />
            </div>
          </div>
        </div>

        {/* Opções */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Opções de Login</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Mostrar "Lembrar-me"</p>
                <p className="text-sm text-muted-foreground">Opção para manter usuário logado</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Mostrar "Esqueci a senha"</p>
                <p className="text-sm text-muted-foreground">Link para recuperação de senha</p>
              </div>
              <input type="checkbox" defaultChecked className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Permitir Cadastro</p>
                <p className="text-sm text-muted-foreground">Novos usuários podem se cadastrar</p>
              </div>
              <input type="checkbox" className="h-5 w-5" />
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Alterações</Button>
          <Button variant="outline">Restaurar Padrão</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Categorias de Serviços — CRUD real com Supabase
function CategoriasServicosContent() {
  const [categorias, setCategorias] = useState<{ id: string; nome: string; cor: string; ativo: boolean; ordem: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaCor, setNovaCor] = useState("#3b82f6");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("#3b82f6");
  const [salvando, setSalvando] = useState(false);

  const carregarCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categorias_servicos")
        .select("*")
        .order("ordem")
        .order("nome");
      if (!error && data) setCategorias(data);
    } catch {
      toast("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarCategorias(); }, []);

  const handleAdicionar = async () => {
    if (!novaCategoria.trim()) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from("categorias_servicos").insert({
        nome: novaCategoria.trim(),
        cor: novaCor,
        ativo: true,
        ordem: categorias.length + 1,
      });
      if (error) throw error;
      setNovaCategoria("");
      setNovaCor("#3b82f6");
      toast("Categoria adicionada!");
      carregarCategorias();
    } catch {
      toast("Erro ao adicionar categoria");
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("categorias_servicos").update({ ativo: !ativo }).eq("id", id);
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ativo: !ativo } : c));
  };

  const handleIniciarEdicao = (cat: { id: string; nome: string; cor: string }) => {
    setEditandoId(cat.id);
    setEditNome(cat.nome);
    setEditCor(cat.cor);
  };

  const handleSalvarEdicao = async () => {
    if (!editandoId || !editNome.trim()) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("categorias_servicos")
        .update({ nome: editNome.trim(), cor: editCor })
        .eq("id", editandoId);
      if (error) throw error;
      toast("Categoria atualizada!");
      setEditandoId(null);
      carregarCategorias();
    } catch {
      toast("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir esta categoria? Os serviços desta categoria ficarão sem categoria.")) return;
    await supabase.from("categorias_servicos").delete().eq("id", id);
    toast("Categoria excluída");
    carregarCategorias();
  };

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Layers className="h-5 w-5" />
        Categorias de Serviços
      </h2>

      <div className="space-y-6">
        {/* Adicionar nova categoria */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nome da nova categoria..."
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={novaCor}
              onChange={(e) => setNovaCor(e.target.value)}
              className="h-10 w-10 rounded border cursor-pointer p-0.5"
              title="Escolher cor da categoria"
              aria-label="Cor da categoria"
            />
            <Button onClick={handleAdicionar} disabled={salvando || !novaCategoria.trim()} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista de categorias */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma categoria cadastrada.</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y overflow-hidden">
            {categorias.map((cat) => (
              <div key={cat.id} className={cn("p-3 sm:p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors", !cat.ativo && "opacity-50")}>
                {/* Cor */}
                {editandoId === cat.id ? (
                  <input
                    type="color"
                    value={editCor}
                    onChange={e => setEditCor(e.target.value)}
                    className="h-8 w-8 rounded border cursor-pointer p-0.5 flex-shrink-0"
                    aria-label="Cor da categoria"
                    title="Cor da categoria"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                )}

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  {editandoId === cat.id ? (
                    <Input
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSalvarEdicao()}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <p className="font-medium truncate">{cat.nome}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editandoId === cat.id ? (
                    <>
                      <Button size="sm" onClick={handleSalvarEdicao} disabled={salvando} className="h-8 px-3">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)} className="h-8 px-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleAtivo(cat.id, cat.ativo)}
                        className={cn("h-8 px-2 rounded text-xs font-medium transition-colors hidden sm:flex items-center gap-1",
                          cat.ativo ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" : "text-muted-foreground hover:bg-muted"
                        )}
                        title={cat.ativo ? "Clique para desativar" : "Clique para ativar"}
                      >
                        {cat.ativo ? "● Ativo" : "○ Inativo"}
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => handleIniciarEdicao(cat)} className="h-8 w-8 p-0" title="Editar">
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleExcluir(cat.id)} className="h-8 w-8 p-0" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
          💡 As categorias criadas aqui aparecem automaticamente no cadastro de serviços.
        </div>
      </div>
    </Card>
  );
}


// Componente Pacotes e Combos
function PacotesCombosContent() {
  const pacotes = [
    { id: 1, nome: "Dia da Noiva", servicos: 5, preco: 450, desconto: 15, ativo: true },
    { id: 2, nome: "Combo Unhas", servicos: 3, preco: 120, desconto: 10, ativo: true },
    { id: 3, nome: "Pacote Mensal Cabelo", servicos: 4, preco: 280, desconto: 20, ativo: false },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Package className="h-5 w-5" />
        Pacotes e Combos
      </h2>

      <div className="space-y-6">
        {/* Botão Adicionar */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Crie combos de serviços com descontos especiais</p>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>

        {/* Lista de Pacotes */}
        <div className="space-y-3">
          {pacotes.map((pacote) => (
            <div key={pacote.id} className={cn(
              "p-4 border rounded-lg",
              !pacote.ativo && "opacity-60"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{pacote.nome}</h4>
                  <p className="text-sm text-muted-foreground">{pacote.servicos} serviços incluídos</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-lg">R$ {pacote.preco.toFixed(2)}</p>
                    <p className="text-sm text-green-600">{pacote.desconto}% de desconto</p>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={pacote.ativo} className="h-4 w-4" />
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <Button variant="outline" size="sm">Editar</Button>
                <Button variant="outline" size="sm">Ver Serviços</Button>
                <Button variant="ghost" size="sm" className="text-destructive ml-auto">Excluir</Button>
              </div>
            </div>
          ))}
        </div>

        {pacotes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pacote cadastrado</p>
            <p className="text-sm">Crie combos para oferecer descontos aos clientes</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Componente Apenas Agenda
function ApenasAgendaContent() {
  const servicosOcultos = [
    { id: 1, nome: "Retoque Gratuito", duracao: 30, ativo: true },
    { id: 2, nome: "Avaliação", duracao: 15, ativo: true },
    { id: 3, nome: "Teste de Mecha", duracao: 20, ativo: false },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <EyeOff className="h-5 w-5" />
        Serviços Apenas Agenda
      </h2>

      <div className="space-y-6">
        {/* Explicação */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            ℹ️ Serviços marcados como "Apenas Agenda" aparecem na agenda mas <strong>não são cobrados</strong> e não aparecem no caixa.
            Ideal para: retoques gratuitos, avaliações, intervalos, etc.
          </p>
        </div>

        {/* Adicionar Serviço */}
        <div className="flex gap-2">
          <Input placeholder="Nome do serviço..." className="flex-1" />
          <Input type="number" placeholder="Duração (min)" className="w-32" />
          <Button>Adicionar</Button>
        </div>

        {/* Lista de Serviços */}
        <div className="border rounded-lg divide-y">
          {servicosOcultos.map((servico) => (
            <div key={servico.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{servico.nome}</p>
                <p className="text-sm text-muted-foreground">{servico.duracao} minutos</p>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={servico.ativo} className="h-4 w-4" />
                <span className="text-sm">Ativo</span>
              </label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">Editar</Button>
                <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Configurações */}
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-medium">Configurações</h3>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Mostrar na agenda do profissional</p>
              <p className="text-sm text-muted-foreground">Exibir estes serviços na visão do profissional</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Permitir agendamento online</p>
              <p className="text-sm text-muted-foreground">Clientes podem agendar via link</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
        </div>
      </div>
    </Card>
  );
}

// Componente Formas de Pagamento
function FormasPagamentoContent() {
  const formas = [
    { id: 1, nome: "Dinheiro", icone: "💵", ativo: true, taxa: 0 },
    { id: 2, nome: "PIX", icone: "📱", ativo: true, taxa: 0 },
    { id: 3, nome: "Cartão de Débito", icone: "💳", ativo: true, taxa: 1.5 },
    { id: 4, nome: "Cartão de Crédito", icone: "💳", ativo: true, taxa: 3.5 },
    { id: 5, nome: "Crediário", icone: "📋", ativo: true, taxa: 0 },
    { id: 6, nome: "Cheque", icone: "📄", ativo: false, taxa: 0 },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Formas de Pagamento
      </h2>

      <div className="space-y-6">
        {/* Adicionar */}
        <div className="flex gap-2">
          <Input placeholder="Nome da forma de pagamento..." className="flex-1" />
          <Input type="number" placeholder="Taxa %" className="w-24" step="0.1" />
          <Button>Adicionar</Button>
        </div>

        {/* Lista */}
        <div className="border rounded-lg divide-y">
          {formas.map((forma) => (
            <div key={forma.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
              <span className="text-2xl">{forma.icone}</span>
              <div className="flex-1">
                <p className={cn("font-medium", !forma.ativo && "text-muted-foreground")}>{forma.nome}</p>
                {forma.taxa > 0 && (
                  <p className="text-sm text-muted-foreground">Taxa: {forma.taxa}%</p>
                )}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={forma.ativo} className="h-4 w-4" />
                <span className="text-sm">Ativo</span>
              </label>
              <Button variant="ghost" size="sm">Editar</Button>
            </div>
          ))}
        </div>

        {/* Configurações */}
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-medium">Configurações</h3>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Permitir pagamento misto</p>
              <p className="text-sm text-muted-foreground">Cliente pode pagar com múltiplas formas</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Exigir comprovante em cartão</p>
              <p className="text-sm text-muted-foreground">Solicitar número da autorização</p>
            </div>
            <input type="checkbox" className="h-5 w-5" />
          </label>
        </div>
      </div>
    </Card>
  );
}

// Componente Categorias de Despesas
function CategoriasDespesasContent() {
  const categorias = [
    { id: 1, nome: "Aluguel", tipo: "fixa", cor: "#ef4444" },
    { id: 2, nome: "Energia", tipo: "fixa", cor: "#f97316" },
    { id: 3, nome: "Água", tipo: "fixa", cor: "#3b82f6" },
    { id: 4, nome: "Internet/Telefone", tipo: "fixa", cor: "#8b5cf6" },
    { id: 5, nome: "Produtos", tipo: "variavel", cor: "#22c55e" },
    { id: 6, nome: "Manutenção", tipo: "variavel", cor: "#eab308" },
    { id: 7, nome: "Marketing", tipo: "variavel", cor: "#ec4899" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <PiggyBank className="h-5 w-5" />
        Categorias de Despesas
      </h2>

      <div className="space-y-6">
        {/* Adicionar */}
        <div className="flex gap-2">
          <Input placeholder="Nome da categoria..." className="flex-1" />
          <select className="p-2 border rounded-lg">
            <option value="fixa">Despesa Fixa</option>
            <option value="variavel">Despesa Variável</option>
          </select>
          <input type="color" defaultValue="#3b82f6" className="h-10 w-10 rounded border" />
          <Button>Adicionar</Button>
        </div>

        {/* Lista */}
        <div className="grid grid-cols-2 gap-3">
          {categorias.map((cat) => (
            <div key={cat.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
              <div className="flex-1">
                <p className="font-medium">{cat.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.tipo === "fixa" ? "Despesa Fixa" : "Despesa Variável"}
                </p>
              </div>
              <Button variant="ghost" size="sm">Editar</Button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          💡 <strong>Despesas Fixas:</strong> valores recorrentes mensais (aluguel, energia)<br />
          💡 <strong>Despesas Variáveis:</strong> valores que mudam conforme necessidade
        </div>
      </div>
    </Card>
  );
}

// Componente Contas Bancárias
function ContasBancariasContent() {
  const contas = [
    { id: 1, banco: "Banco do Brasil", agencia: "1234-5", conta: "12345-6", tipo: "Corrente", saldo: 5430.50, principal: true },
    { id: 2, banco: "Nubank", agencia: "0001", conta: "98765-4", tipo: "Corrente", saldo: 2150.00, principal: false },
    { id: 3, banco: "Caixa", agencia: "0987", conta: "54321-0", tipo: "Poupança", saldo: 8000.00, principal: false },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Contas Bancárias
      </h2>

      <div className="space-y-6">
        {/* Adicionar */}
        <div className="flex justify-end">
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {contas.map((conta) => (
            <div key={conta.id} className={cn(
              "p-4 border rounded-lg",
              conta.principal && "border-primary bg-primary/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{conta.banco}</h4>
                  {conta.principal && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Principal</span>
                  )}
                </div>
                <p className="font-semibold text-lg">R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>Ag: {conta.agencia} | Conta: {conta.conta} | {conta.tipo}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Editar</Button>
                  {!conta.principal && (
                    <Button variant="ghost" size="sm">Definir como Principal</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium">Saldo Total:</span>
            <span className="text-xl font-bold text-green-600">
              R$ {contas.reduce((acc, c) => acc + c.saldo, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Componente Comissões
function ComissoesContent() {
  const regras = [
    { id: 1, nome: "Comissão Padrão Serviços", percentual: 40, tipo: "servicos" },
    { id: 2, nome: "Comissão Padrão Produtos", percentual: 10, tipo: "produtos" },
    { id: 3, nome: "Bônus Alcançar Meta", percentual: 5, tipo: "bonus" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Percent className="h-5 w-5" />
        Configurações de Comissões
      </h2>

      <div className="space-y-6">
        {/* Comissões Padrão */}
        <div className="space-y-4">
          <h3 className="font-medium">Comissões Padrão</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="h-4 w-4 text-primary" />
                <span className="font-medium">Serviços</span>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue="40" className="w-20" />
                <span>%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Aplicado quando não há comissão específica</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">Produtos</span>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue="10" className="w-20" />
                <span>%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Comissão sobre vendas de produtos</p>
            </div>
          </div>
        </div>

        {/* Regras Especiais */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Regras Especiais</h3>
            <Button variant="outline" size="sm">Adicionar Regra</Button>
          </div>
          <div className="border rounded-lg divide-y">
            {regras.map((regra) => (
              <div key={regra.id} className="p-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{regra.nome}</p>
                  <p className="text-sm text-muted-foreground capitalize">{regra.tipo}</p>
                </div>
                <span className="font-semibold text-primary">{regra.percentual}%</span>
                <Button variant="ghost" size="sm">Editar</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Configurações */}
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-medium">Configurações</h3>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Comissão sobre valor líquido</p>
              <p className="text-sm text-muted-foreground">Calcular após descontos</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Deduzir vales automaticamente</p>
              <p className="text-sm text-muted-foreground">Descontar vales do fechamento</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Exibir comissão no fechamento</p>
              <p className="text-sm text-muted-foreground">Mostrar valores ao fechar caixa</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button>Salvar Configurações</Button>
        </div>
      </div>
    </Card>
  );
}

// ========== PRODUTOS CONTENT COMPONENTS ==========

function CategoriasProdutosContent() {
  const [categorias, setCategorias] = useState([
    { id: "1", nome: "Cabelo", descricao: "Produtos para cabelo", cor: "#8B5CF6", produtosCount: 25 },
    { id: "2", nome: "Unhas", descricao: "Esmaltes e acessórios", cor: "#EC4899", produtosCount: 18 },
    { id: "3", nome: "Pele", descricao: "Cremes e hidratantes", cor: "#10B981", produtosCount: 12 },
    { id: "4", nome: "Maquiagem", descricao: "Produtos de maquiagem", cor: "#F59E0B", produtosCount: 30 },
  ]);
  const [novaCategoria, setNovaCategoria] = useState({ nome: "", descricao: "", cor: "#8B5CF6" });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Categorias de Produtos
            </h2>
            <p className="text-muted-foreground text-sm">Organize seus produtos em categorias</p>
          </div>
        </div>

        {/* Nova Categoria */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <h3 className="font-medium">Nova Categoria</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Nome da categoria"
              value={novaCategoria.nome}
              onChange={(e) => setNovaCategoria(prev => ({ ...prev, nome: e.target.value }))}
            />
            <Input
              placeholder="Descrição"
              value={novaCategoria.descricao}
              onChange={(e) => setNovaCategoria(prev => ({ ...prev, descricao: e.target.value }))}
            />
            <div className="flex gap-2">
              <Input
                type="color"
                value={novaCategoria.cor}
                onChange={(e) => setNovaCategoria(prev => ({ ...prev, cor: e.target.value }))}
                className="w-16 p-1 h-10"
              />
              <Button className="flex-1">Adicionar</Button>
            </div>
          </div>
        </div>

        {/* Lista de Categorias */}
        <div className="border rounded-lg divide-y">
          {categorias.map((cat) => (
            <div key={cat.id} className="p-4 flex items-center gap-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cat.cor }}
              />
              <div className="flex-1">
                <p className="font-medium">{cat.nome}</p>
                <p className="text-sm text-muted-foreground">{cat.descricao}</p>
              </div>
              <span className="text-sm text-muted-foreground">{cat.produtosCount} produtos</span>
              <Button variant="ghost" size="sm">Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FornecedoresContent() {
  const [fornecedores, setFornecedores] = useState([
    { id: "1", nome: "L'Oréal Brasil", cnpj: "12.345.678/0001-90", contato: "(11) 99999-0001", email: "contato@loreal.com", ativo: true },
    { id: "2", nome: "Wella Professionals", cnpj: "23.456.789/0001-01", contato: "(11) 99999-0002", email: "contato@wella.com", ativo: true },
    { id: "3", nome: "Distribuidora Beleza", cnpj: "34.567.890/0001-12", contato: "(11) 99999-0003", email: "contato@distbeleza.com", ativo: true },
  ]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Fornecedores
            </h2>
            <p className="text-muted-foreground text-sm">Gerencie seus fornecedores de produtos</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Lista de Fornecedores */}
        <div className="border rounded-lg divide-y">
          {fornecedores.map((f) => (
            <div key={f.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{f.nome}</p>
                <p className="text-sm text-muted-foreground">CNPJ: {f.cnpj}</p>
              </div>
              <div className="text-sm text-right">
                <p>{f.contato}</p>
                <p className="text-muted-foreground">{f.email}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${f.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {f.ativo ? "Ativo" : "Inativo"}
              </span>
              <Button variant="ghost" size="sm">Editar</Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function UnidadesMedidaContent() {
  const [unidades, setUnidades] = useState([
    { id: "1", sigla: "UN", nome: "Unidade", descricao: "Quantidade unitária" },
    { id: "2", sigla: "ML", nome: "Mililitro", descricao: "Volume em mililitros" },
    { id: "3", sigla: "G", nome: "Grama", descricao: "Peso em gramas" },
    { id: "4", sigla: "KG", nome: "Quilograma", descricao: "Peso em quilogramas" },
    { id: "5", sigla: "L", nome: "Litro", descricao: "Volume em litros" },
    { id: "6", sigla: "CX", nome: "Caixa", descricao: "Quantidade por caixa" },
  ]);
  const [novaUnidade, setNovaUnidade] = useState({ sigla: "", nome: "", descricao: "" });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Unidades de Medida
            </h2>
            <p className="text-muted-foreground text-sm">Configure as unidades de medida dos produtos</p>
          </div>
        </div>

        {/* Nova Unidade */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <h3 className="font-medium">Nova Unidade</h3>
          <div className="grid grid-cols-4 gap-4">
            <Input
              placeholder="Sigla (ex: UN)"
              value={novaUnidade.sigla}
              onChange={(e) => setNovaUnidade(prev => ({ ...prev, sigla: e.target.value.toUpperCase() }))}
              maxLength={5}
            />
            <Input
              placeholder="Nome"
              value={novaUnidade.nome}
              onChange={(e) => setNovaUnidade(prev => ({ ...prev, nome: e.target.value }))}
            />
            <Input
              placeholder="Descrição"
              value={novaUnidade.descricao}
              onChange={(e) => setNovaUnidade(prev => ({ ...prev, descricao: e.target.value }))}
            />
            <Button>Adicionar</Button>
          </div>
        </div>

        {/* Lista de Unidades */}
        <div className="border rounded-lg divide-y">
          {unidades.map((u) => (
            <div key={u.id} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                {u.sigla}
              </div>
              <div className="flex-1">
                <p className="font-medium">{u.nome}</p>
                <p className="text-sm text-muted-foreground">{u.descricao}</p>
              </div>
              <Button variant="ghost" size="sm">Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ========== AGENDA CONTENT COMPONENTS ==========

function HorariosDisponiveisContent() {
  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const [horarios, setHorarios] = useState(
    diasSemana.map((dia, idx) => ({
      dia,
      ativo: idx < 6,
      inicio: "08:00",
      fim: "18:00",
      intervaloInicio: "12:00",
      intervaloFim: "13:00"
    }))
  );

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horários Disponíveis
          </h2>
          <p className="text-muted-foreground text-sm">Configure os horários de funcionamento da agenda</p>
        </div>

        <div className="border rounded-lg divide-y">
          {horarios.map((h, idx) => (
            <div key={h.dia} className="p-4 flex items-center gap-4">
              <label className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  checked={h.ativo}
                  onChange={(e) => {
                    const newHorarios = [...horarios];
                    newHorarios[idx].ativo = e.target.checked;
                    setHorarios(newHorarios);
                  }}
                  className="h-4 w-4"
                />
                <span className="font-medium">{h.dia}</span>
              </label>
              {h.ativo && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Das</span>
                    <Input
                      type="time"
                      value={h.inicio}
                      onChange={(e) => {
                        const newHorarios = [...horarios];
                        newHorarios[idx].inicio = e.target.value;
                        setHorarios(newHorarios);
                      }}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={h.fim}
                      onChange={(e) => {
                        const newHorarios = [...horarios];
                        newHorarios[idx].fim = e.target.value;
                        setHorarios(newHorarios);
                      }}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-muted-foreground">Intervalo:</span>
                    <Input
                      type="time"
                      value={h.intervaloInicio}
                      onChange={(e) => {
                        const newHorarios = [...horarios];
                        newHorarios[idx].intervaloInicio = e.target.value;
                        setHorarios(newHorarios);
                      }}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={h.intervaloFim}
                      onChange={(e) => {
                        const newHorarios = [...horarios];
                        newHorarios[idx].intervaloFim = e.target.value;
                        setHorarios(newHorarios);
                      }}
                      className="w-28"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <Button>Salvar Horários</Button>
      </div>
    </Card>
  );
}

function IntervalosContent() {
  const [intervalos, setIntervalos] = useState([
    { id: "1", nome: "Almoço", inicio: "12:00", fim: "13:00", aplicarTodos: true },
    { id: "2", nome: "Lanche", inicio: "15:30", fim: "15:45", aplicarTodos: false },
  ]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Intervalos
            </h2>
            <p className="text-muted-foreground text-sm">Configure intervalos padrão na agenda</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Intervalo
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {intervalos.map((i) => (
            <div key={i.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{i.nome}</p>
                <p className="text-sm text-muted-foreground">{i.inicio} - {i.fim}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${i.aplicarTodos ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {i.aplicarTodos ? "Todos os profissionais" : "Selecionados"}
              </span>
              <Button variant="ghost" size="sm">Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CoresVisualizacaoContent() {
  const [config, setConfig] = useState({
    visualizacaoPadrao: "semana",
    corAgendado: "#3B82F6",
    corConfirmado: "#10B981",
    corCancelado: "#EF4444",
    corConcluido: "#8B5CF6",
    corAguardando: "#F59E0B",
    mostrarFotoCliente: true,
    mostrarTelefone: true,
    mostrarServico: true,
    tamanhoSlot: 30
  });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Cores e Visualização
          </h2>
          <p className="text-muted-foreground text-sm">Personalize a aparência da agenda</p>
        </div>

        {/* Visualização */}
        <div className="space-y-4">
          <h3 className="font-medium">Visualização Padrão</h3>
          <div className="flex gap-2">
            {["dia", "semana", "mes"].map((v) => (
              <Button
                key={v}
                variant={config.visualizacaoPadrao === v ? "default" : "outline"}
                onClick={() => setConfig(prev => ({ ...prev, visualizacaoPadrao: v }))}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
        </div>

        {/* Cores por Status */}
        <div className="space-y-4">
          <h3 className="font-medium">Cores por Status</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "corAgendado", label: "Agendado" },
              { key: "corConfirmado", label: "Confirmado" },
              { key: "corCancelado", label: "Cancelado" },
              { key: "corConcluido", label: "Concluído" },
              { key: "corAguardando", label: "Aguardando" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3 p-3 border rounded-lg">
                <Input
                  type="color"
                  value={config[item.key as keyof typeof config] as string}
                  onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.value }))}
                  className="w-10 h-10 p-1"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Opções de Exibição */}
        <div className="space-y-3">
          <h3 className="font-medium">Opções de Exibição</h3>
          {[
            { key: "mostrarFotoCliente", label: "Mostrar foto do cliente" },
            { key: "mostrarTelefone", label: "Mostrar telefone" },
            { key: "mostrarServico", label: "Mostrar nome do serviço" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={config[item.key as keyof typeof config] as boolean}
                onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))}
                className="h-5 w-5"
              />
            </label>
          ))}
        </div>

        {/* Tamanho do Slot */}
        <div className="space-y-3">
          <h3 className="font-medium">Tamanho do Slot (minutos)</h3>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((m) => (
              <Button
                key={m}
                variant={config.tamanhoSlot === m ? "default" : "outline"}
                onClick={() => setConfig(prev => ({ ...prev, tamanhoSlot: m }))}
              >
                {m} min
              </Button>
            ))}
          </div>
        </div>

        <Button>Salvar Configurações</Button>
      </div>
    </Card>
  );
}

function LembretesContent() {
  const [config, setConfig] = useState({
    enviarLembrete: true,
    antecedendia24h: true,
    antecedencia2h: true,
    antecedencia1h: false,
    canalWhatsApp: true,
    canalSMS: false,
    canalEmail: true,
    mensagemPersonalizada: "Olá {nome}, lembrando do seu agendamento amanhã às {hora} com {profissional}. Confirme sua presença!"
  });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Lembretes
            </h2>
            <p className="text-muted-foreground text-sm">Configure lembretes automáticos de agendamentos</p>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-sm">Ativar lembretes</span>
            <input
              type="checkbox"
              checked={config.enviarLembrete}
              onChange={(e) => setConfig(prev => ({ ...prev, enviarLembrete: e.target.checked }))}
              className="h-5 w-5"
            />
          </label>
        </div>

        {config.enviarLembrete && (
          <>
            {/* Antecedência */}
            <div className="space-y-3">
              <h3 className="font-medium">Antecedência do Envio</h3>
              {[
                { key: "antecedendia24h", label: "24 horas antes" },
                { key: "antecedencia2h", label: "2 horas antes" },
                { key: "antecedencia1h", label: "1 hora antes" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config[item.key as keyof typeof config] as boolean}
                    onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Canais */}
            <div className="space-y-3">
              <h3 className="font-medium">Canais de Envio</h3>
              {[
                { key: "canalWhatsApp", label: "WhatsApp", icon: MessageSquare },
                { key: "canalSMS", label: "SMS", icon: Phone },
                { key: "canalEmail", label: "E-mail", icon: Mail },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config[item.key as keyof typeof config] as boolean}
                    onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Mensagem */}
            <div className="space-y-3">
              <h3 className="font-medium">Mensagem Personalizada</h3>
              <textarea
                value={config.mensagemPersonalizada}
                onChange={(e) => setConfig(prev => ({ ...prev, mensagemPersonalizada: e.target.value }))}
                className="w-full p-3 border rounded-lg min-h-[100px]"
                placeholder="Use {nome}, {hora}, {profissional}, {servico} para personalizar"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{nome}"}, {"{hora}"}, {"{data}"}, {"{profissional}"}, {"{servico}"}
              </p>
            </div>
          </>
        )}

        <Button>Salvar Configurações</Button>
      </div>
    </Card>
  );
}

// Componente Email Automático de Relatórios
function EmailAutomaticoContent() {
  const [config, setConfig] = useState({
    ativo: false,
    frequencia: "semanal",
    diaEnvio: "1",
    horaEnvio: "08:00",
    emailDestino: "",
    incluirVendas: true,
    incluirFinanceiro: true,
    incluirEstoque: false,
    incluirClientes: false,
    formato: "pdf",
  });

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Mail className="h-5 w-5" />
        Email Automático de Relatórios
      </h2>
      <div className="space-y-6">
        <label className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Ativar envio automático</p>
            <p className="text-sm text-muted-foreground">Receba relatórios periodicamente por email</p>
          </div>
          <input type="checkbox" checked={config.ativo} onChange={(e) => setConfig(p => ({ ...p, ativo: e.target.checked }))} className="h-5 w-5" />
        </label>

        {config.ativo && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Frequência</label>
                <select value={config.frequencia} onChange={(e) => setConfig(p => ({ ...p, frequencia: e.target.value }))} className="w-full mt-1 p-2 border rounded-lg">
                  <option value="diario">Diário</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Horário de envio</label>
                <Input type="time" value={config.horaEnvio} onChange={(e) => setConfig(p => ({ ...p, horaEnvio: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email de destino</label>
              <Input type="email" placeholder="seu@email.com" value={config.emailDestino} onChange={(e) => setConfig(p => ({ ...p, emailDestino: e.target.value }))} className="mt-1" />
            </div>
            <div className="space-y-3">
              <h3 className="font-medium">Relatórios incluídos</h3>
              {[
                { key: "incluirVendas", label: "Vendas e Faturamento" },
                { key: "incluirFinanceiro", label: "Financeiro (DRE)" },
                { key: "incluirEstoque", label: "Estoque" },
                { key: "incluirClientes", label: "Clientes" },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3">
                  <input type="checkbox" checked={config[item.key as keyof typeof config] as boolean} onChange={(e) => setConfig(p => ({ ...p, [item.key]: e.target.checked }))} className="h-4 w-4" />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Formato</label>
              <div className="flex gap-2 mt-1">
                {["pdf", "excel"].map(f => (
                  <Button key={f} variant={config.formato === f ? "default" : "outline"} onClick={() => setConfig(p => ({ ...p, formato: f }))} className="uppercase">{f}</Button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="pt-4 border-t">
          <Button onClick={() => toast.success("Configurações de email salvas!")}>Salvar Configurações</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Formatos Padrão
function FormatosPadraoContent() {
  const [config, setConfig] = useState({
    formatoPadrao: "pdf",
    orientacao: "retrato",
    tamanhoPapel: "a4",
    incluirLogo: true,
    incluirRodape: true,
    incluirNumeroPagina: true,
    corCabecalho: "#1e3a5f",
  });

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Formatos Padrão de Relatórios
      </h2>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Formato Padrão de Exportação</label>
            <select value={config.formatoPadrao} onChange={(e) => setConfig(p => ({ ...p, formatoPadrao: e.target.value }))} className="w-full mt-1 p-2 border rounded-lg">
              <option value="pdf">PDF</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Orientação (PDF)</label>
            <select value={config.orientacao} onChange={(e) => setConfig(p => ({ ...p, orientacao: e.target.value }))} className="w-full mt-1 p-2 border rounded-lg">
              <option value="retrato">Retrato</option>
              <option value="paisagem">Paisagem</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Tamanho do Papel</label>
          <select value={config.tamanhoPapel} onChange={(e) => setConfig(p => ({ ...p, tamanhoPapel: e.target.value }))} className="w-full mt-1 p-2 border rounded-lg">
            <option value="a4">A4</option>
            <option value="carta">Carta</option>
            <option value="oficio">Ofício</option>
          </select>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">Opções do PDF</h3>
          {[
            { key: "incluirLogo", label: "Incluir logo no cabeçalho" },
            { key: "incluirRodape", label: "Incluir rodapé com dados do salão" },
            { key: "incluirNumeroPagina", label: "Incluir número de página" },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
              <span>{item.label}</span>
              <input type="checkbox" checked={config[item.key as keyof typeof config] as boolean} onChange={(e) => setConfig(p => ({ ...p, [item.key]: e.target.checked }))} className="h-5 w-5" />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Cor do cabeçalho</label>
          <input type="color" value={config.corCabecalho} onChange={(e) => setConfig(p => ({ ...p, corCabecalho: e.target.value }))} className="h-10 w-16 rounded border" />
        </div>
        <div className="pt-4 border-t">
          <Button onClick={() => toast.success("Formatos padrão salvos!")}>Salvar Configurações</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Logo nos Relatórios
function LogoRelatoriosContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Image className="h-5 w-5" />
        Logo para Relatórios
      </h2>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Este logo será exibido no cabeçalho de todos os PDFs gerados pelo sistema (relatórios, cupons, recibos).
        </p>
        <div className="flex items-start gap-6">
          <div className="w-48 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Image className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Logo do cabeçalho</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Logo
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
            <p className="text-xs text-muted-foreground">Formatos: PNG, JPG ou SVG • Máx: 1MB • Recomendado: 400x100px</p>
          </div>
        </div>
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-medium">Posição do Logo</h3>
          <div className="flex gap-2">
            {["Esquerda", "Centro", "Direita"].map(pos => (
              <Button key={pos} variant={pos === "Esquerda" ? "default" : "outline"} size="sm">{pos}</Button>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t pt-6">
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Incluir nome do salão abaixo do logo</p>
              <p className="text-sm text-muted-foreground">Exibe o nome fantasia junto ao logo</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
        </div>
        <div className="pt-4 border-t">
          <Button onClick={() => toast.success("Configurações do logo salvas!")}>Salvar Alterações</Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Suporte
function SuporteContent() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <HelpCircle className="h-5 w-5" />
        Suporte Técnico
      </h2>
      <div className="space-y-6">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Precisa de ajuda?</p>
              <p className="text-sm text-muted-foreground">Nossa equipe está pronta para atendê-lo</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <h3 className="font-medium">WhatsApp</h3>
            </div>
            <p className="text-sm text-muted-foreground">Atendimento rápido via WhatsApp</p>
            <p className="font-mono text-sm">(35) 99999-9999</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("https://wa.me/5535999999999", "_blank")}>
              Abrir WhatsApp
            </Button>
          </div>
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">E-mail</h3>
            </div>
            <p className="text-sm text-muted-foreground">Envie sua dúvida por email</p>
            <p className="font-mono text-sm">suporte@maiconmaksuel.com</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("mailto:suporte@maiconmaksuel.com")}>
              Enviar E-mail
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-medium">Horário de Atendimento</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Segunda a Sexta:</span>
            <span>08:00 - 18:00</span>
            <span className="text-muted-foreground">Sábado:</span>
            <span>08:00 - 12:00</span>
            <span className="text-muted-foreground">Domingo e Feriados:</span>
            <span>Fechado</span>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Informações do Sistema</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono">
            <span className="text-muted-foreground">Versão:</span>
            <span>2.0.5</span>
            <span className="text-muted-foreground">Ambiente:</span>
            <span>Produção</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText("Versão: 2.0.5 | Ambiente: Produção"); toast.success("Info copiada!"); }}>
            Copiar info para suporte
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Componente Documentação
function DocumentacaoContent() {
  const docs = [
    { titulo: "Guia Rápido de Início", desc: "Primeiros passos com o sistema", icon: "🚀" },
    { titulo: "Manual do Usuário", desc: "Guia completo de todas as funcionalidades", icon: "📖" },
    { titulo: "Configurações do Sistema", desc: "Como configurar cada módulo", icon: "⚙️" },
    { titulo: "Gestão Financeira", desc: "Caixa, comissões e relatórios", icon: "💰" },
    { titulo: "Agenda e Atendimentos", desc: "Agendamentos e comandas", icon: "📅" },
    { titulo: "WhatsApp e Comunicação", desc: "Integração com WhatsApp", icon: "💬" },
    { titulo: "Modo Kiosk", desc: "Terminal de autoatendimento", icon: "🖥️" },
    { titulo: "Perguntas Frequentes", desc: "Dúvidas mais comuns", icon: "❓" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Documentação
      </h2>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Acesse os guias e manuais do sistema para aproveitar todos os recursos disponíveis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map((doc, i) => (
            <button
              key={i}
              className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
              onClick={() => toast.info(`Documentação "${doc.titulo}" em breve!`)}
            >
              <span className="text-2xl">{doc.icon}</span>
              <div>
                <p className="font-medium">{doc.titulo}</p>
                <p className="text-sm text-muted-foreground">{doc.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3 border-t pt-6">
          <h3 className="font-medium">Links Úteis</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/mapa-sistema"}>
              <Globe className="h-4 w-4 mr-2" />
              Mapa do Sistema
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Changelog em breve!")}>
              <History className="h-4 w-4 mr-2" />
              Changelog
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BloqueiosContent() {
  const [bloqueios, setBloqueios] = useState([
    { id: "1", titulo: "Feriado - Natal", dataInicio: "2024-12-25", dataFim: "2024-12-25", profissional: "Todos", motivo: "Feriado nacional" },
    { id: "2", titulo: "Férias Maria", dataInicio: "2024-01-15", dataFim: "2024-01-30", profissional: "Maria Silva", motivo: "Férias" },
  ]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-primary" />
              Bloqueios de Agenda
            </h2>
            <p className="text-muted-foreground text-sm">Gerencie bloqueios e indisponibilidades</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Bloqueio
          </Button>
        </div>

        <div className="border rounded-lg divide-y">
          {bloqueios.map((b) => (
            <div key={b.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{b.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {b.dataInicio === b.dataFim ? b.dataInicio : `${b.dataInicio} até ${b.dataFim}`}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{b.profissional}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">{b.motivo}</span>
              <Button variant="ghost" size="sm">Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}