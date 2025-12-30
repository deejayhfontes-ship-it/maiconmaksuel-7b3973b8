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
  gradient: string;
}

const AtalhosRapidos = () => {
  const navigate = useNavigate();
  
  const atalhos: Atalho[] = [
    { Icon: Calendar, label: 'Agenda', link: '/agenda', gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' },
    { Icon: Scissors, label: 'Atendimentos', link: '/atendimentos', gradient: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)' },
    { Icon: Users, label: 'Clientes', link: '/clientes', gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' },
    { Icon: UserCircle, label: 'Profissionais', link: '/profissionais', gradient: 'linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)' },
    { Icon: Package, label: 'Produtos', link: '/produtos', gradient: 'linear-gradient(135deg, #30D158 0%, #00C853 100%)' },
    { Icon: Wallet, label: 'Caixa', link: '/caixa', gradient: 'linear-gradient(135deg, #32ADE6 0%, #0A84FF 100%)' },
    { Icon: Target, label: 'Metas', link: '/configuracoes/metas', gradient: 'linear-gradient(135deg, #FF3B30 0%, #FF453A 100%)' },
    { Icon: BarChart3, label: 'Relatórios', link: '/relatorios', gradient: 'linear-gradient(135deg, #AF52DE 0%, #BF5AF2 100%)' },
    { Icon: FileText, label: 'Notas Fiscais', link: '/notas-fiscais', gradient: 'linear-gradient(135deg, #FF2D55 0%, #FF375F 100%)' },
    { Icon: Settings, label: 'Configurações', link: '/configuracoes', gradient: 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)' },
    { Icon: UserCog, label: 'Gestão RH', link: '/gestao-rh', gradient: 'linear-gradient(135deg, #FF9F0A 0%, #FF6F00 100%)' },
    { Icon: CheckCircle, label: 'Confirmações', link: '/confirmacoes-whatsapp', gradient: 'linear-gradient(135deg, #30D158 0%, #34C759 100%)' }
  ];
  
  return (
    <div className="w-full my-10 px-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-5 sm:gap-6 lg:gap-8 justify-items-center max-w-6xl mx-auto">
        {atalhos.map((atalho) => {
          const { Icon } = atalho;
          
          return (
            <div
              key={atalho.label}
              onClick={() => navigate(atalho.link)}
              className="flex flex-col items-center gap-3 cursor-pointer group"
            >
              {/* Ícone estilo iOS grande */}
              <div
                className="
                  w-[100px] h-[100px] 
                  sm:w-[120px] sm:h-[120px]
                  lg:w-[140px] lg:h-[140px]
                  rounded-[24px] sm:rounded-[28px] lg:rounded-[32px]
                  flex items-center justify-center
                  transition-all duration-200 ease-out
                  group-hover:scale-105 group-hover:-translate-y-1
                  group-active:scale-95
                "
                style={{
                  background: atalho.gradient,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Icon 
                  className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white"
                  strokeWidth={1.5}
                />
              </div>
              
              {/* Label */}
              <span className="text-xs sm:text-sm font-medium text-foreground/90 text-center leading-tight">
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
