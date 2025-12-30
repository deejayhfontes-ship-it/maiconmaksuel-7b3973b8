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
  Palette
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Backup components
import BackupManual from "@/components/configuracoes/backup/BackupManual";
import BackupAutomatico from "@/components/configuracoes/backup/BackupAutomatico";
import RestaurarBackup from "@/components/configuracoes/backup/RestaurarBackup";
import ImportarDados from "@/components/configuracoes/backup/ImportarDados";
import ExportarDados from "@/components/configuracoes/backup/ExportarDados";
import LimparDados from "@/components/configuracoes/backup/LimparDados";

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  danger?: boolean;
};

const menuSections: MenuSection[] = [
  {
    title: "Geral",
    items: [
      { id: "empresa", label: "Dados da Empresa", icon: Building },
      { id: "aparencia", label: "Aparência", icon: Palette },
      { id: "notificacoes", label: "Notificações", icon: Bell },
      { id: "seguranca", label: "Segurança", icon: Shield },
    ],
  },
  {
    title: "Integrações",
    items: [
      { id: "fiscal", label: "Nota Fiscal", icon: FileText, route: "/configuracoes/fiscal" },
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, route: "/configuracoes/whatsapp" },
      { id: "metas", label: "Metas do Salão", icon: Target, route: "/configuracoes/metas" },
    ],
  },
  {
    title: "Backup e Dados",
    items: [
      { id: "backup-manual", label: "Fazer Backup Manual", icon: Download },
      { id: "backup-automatico", label: "Backup Automático", icon: RefreshCw },
      { id: "restaurar", label: "Restaurar Backup", icon: Upload },
      { id: "importar", label: "Importar Dados", icon: Database },
      { id: "exportar", label: "Exportar Dados", icon: Download },
      { id: "limpar", label: "Limpar Dados", icon: Trash2, danger: true },
    ],
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState("backup-manual");

  const handleMenuClick = (item: MenuItem) => {
    if (item.route) {
      navigate(item.route);
    } else {
      setSelectedItem(item.id);
    }
  };

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
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma opção no menu</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="flex gap-6">
        {/* Menu Lateral */}
        <Card className="w-64 flex-shrink-0 p-4">
          <nav className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = selectedItem === item.id;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleMenuClick(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : item.danger
                              ? "text-destructive hover:bg-destructive/10"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Card>

        {/* Conteúdo */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
