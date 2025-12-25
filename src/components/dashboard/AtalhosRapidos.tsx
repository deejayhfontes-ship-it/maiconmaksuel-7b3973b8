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
    { 
      Icon: Calendar, 
      label: 'Agenda', 
      link: '/agenda',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)'
    },
    { 
      Icon: Scissors, 
      label: 'Atendimentos', 
      link: '/atendimentos',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #3BAEA5 100%)'
    },
    { 
      Icon: Users, 
      label: 'Clientes', 
      link: '/clientes',
      gradient: 'linear-gradient(135deg, #A8E6CF 0%, #4CD964 100%)'
    },
    { 
      Icon: UserCircle, 
      label: 'Profissionais', 
      link: '/profissionais',
      gradient: 'linear-gradient(135deg, #FFCA28 0%, #FFB300 100%)'
    },
    { 
      Icon: Package, 
      label: 'Produtos', 
      link: '/produtos',
      gradient: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)'
    },
    { 
      Icon: Wallet, 
      label: 'Caixa', 
      link: '/caixa',
      gradient: 'linear-gradient(135deg, #4DD0E1 0%, #00ACC1 100%)'
    },
    { 
      Icon: Target, 
      label: 'Metas', 
      link: '/profissionais',
      gradient: 'linear-gradient(135deg, #FF7043 0%, #F4511E 100%)'
    },
    { 
      Icon: BarChart3, 
      label: 'Relatórios', 
      link: '/relatorios',
      gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)'
    },
    { 
      Icon: FileText, 
      label: 'Notas Fiscais', 
      link: '/notas-fiscais',
      gradient: 'linear-gradient(135deg, #EC407A 0%, #D81B60 100%)'
    },
    { 
      Icon: Settings, 
      label: 'Configurações', 
      link: '/configuracoes-fiscal',
      gradient: 'linear-gradient(135deg, #78909C 0%, #546E7A 100%)'
    },
    { 
      Icon: UserCog, 
      label: 'Gestão RH', 
      link: '/rh/funcionarios',
      gradient: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
    },
    { 
      Icon: CheckCircle, 
      label: 'Confirmações', 
      link: '/confirmacoes',
      gradient: 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)'
    }
  ];
  
  return (
    <div className="w-full my-10 px-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 justify-items-center max-w-5xl mx-auto">
        {atalhos.map((atalho) => {
          const { Icon } = atalho;
          
          return (
            <div
              key={atalho.label}
              onClick={() => navigate(atalho.link)}
              className="
                w-[100px] h-[100px] 
                sm:w-[110px] sm:h-[110px] 
                lg:w-[120px] lg:h-[120px]
                rounded-[24px] sm:rounded-[26px] lg:rounded-[28px]
                flex flex-col items-center justify-center
                cursor-pointer
                relative overflow-hidden
                transition-all duration-300 ease-out
                hover:scale-[1.08] hover:-translate-y-1
                active:scale-[0.92]
                border border-white/20
              "
              style={{
                background: atalho.gradient,
                boxShadow: `
                  0 1px 3px rgba(0, 0, 0, 0.06),
                  0 4px 12px rgba(0, 0, 0, 0.08),
                  0 12px 28px rgba(0, 0, 0, 0.06)
                `
              }}
            >
              {/* Brilho iOS no topo */}
              <div 
                className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none rounded-t-[24px] sm:rounded-t-[26px] lg:rounded-t-[28px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)'
                }}
              />
              
              {/* Círculo branco para ícone */}
              <div 
                className="
                  w-12 h-12 sm:w-[52px] sm:h-[52px] lg:w-14 lg:h-14
                  rounded-full 
                  flex items-center justify-center
                  mb-2
                  z-10
                "
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                }}
              >
                <Icon 
                  className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white"
                  strokeWidth={2}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                  }}
                />
              </div>
              
              {/* Label */}
              <span 
                className="
                  text-[11px] sm:text-xs lg:text-[13px]
                  font-semibold text-white text-center
                  z-10 px-2 leading-tight
                "
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
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
