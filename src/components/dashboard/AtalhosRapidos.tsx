import { 
  Calendar, 
  Scissors, 
  Users, 
  UserCircle, 
  Package, 
  Wallet, 
  Target, 
  BarChart3, 
  FileText, 
  Settings, 
  UserCog, 
  CheckCircle,
  LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Atalho {
  Icon: LucideIcon;
  label: string;
  link: string;
  color: string;
}

const AtalhosRapidos = () => {
  const navigate = useNavigate();
  
  const atalhos: Atalho[] = [
    { Icon: Calendar, label: 'Agenda', link: '/agenda', color: '#007AFF' },
    { Icon: Scissors, label: 'Atendimentos', link: '/atendimentos', color: '#5AC8FA' },
    { Icon: Users, label: 'Clientes', link: '/clientes', color: '#34C759' },
    { Icon: UserCircle, label: 'Profissionais', link: '/profissionais', color: '#FF9500' },
    { Icon: Package, label: 'Produtos', link: '/produtos', color: '#30D158' },
    { Icon: Wallet, label: 'Caixa', link: '/caixa', color: '#32ADE6' },
    { Icon: Target, label: 'Metas', link: '/profissionais', color: '#FF3B30' },
    { Icon: BarChart3, label: 'Relatórios', link: '/relatorios', color: '#AF52DE' },
    { Icon: FileText, label: 'Notas Fiscais', link: '/notas-fiscais', color: '#FF2D55' },
    { Icon: Settings, label: 'Configurações', link: '/configuracoes-fiscal', color: '#8E8E93' },
    { Icon: UserCog, label: 'Gestão RH', link: '/rh/funcionarios', color: '#FF9F0A' },
    { Icon: CheckCircle, label: 'Confirmações', link: '/confirmacoes', color: '#30D158' }
  ];
  
  return (
    <div className="w-full my-8 px-4">
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-6 gap-6 sm:gap-8 justify-items-center max-w-4xl mx-auto">
        {atalhos.map((atalho) => {
          const { Icon } = atalho;
          
          return (
            <div
              key={atalho.label}
              onClick={() => navigate(atalho.link)}
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              {/* Ícone estilo iOS */}
              <div
                className="
                  w-[60px] h-[60px] 
                  sm:w-[70px] sm:h-[70px]
                  rounded-[16px] sm:rounded-[18px]
                  flex items-center justify-center
                  transition-transform duration-200 ease-out
                  group-hover:scale-105
                  group-active:scale-95
                "
                style={{
                  backgroundColor: atalho.color,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                }}
              >
                <Icon 
                  className="w-7 h-7 sm:w-8 sm:h-8 text-white"
                  strokeWidth={1.8}
                />
              </div>
              
              {/* Label */}
              <span className="text-[11px] sm:text-xs font-medium text-foreground/80 text-center leading-tight max-w-[70px]">
                {atalho.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtalhosRapidos;
