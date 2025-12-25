import { 
  Calendar, 
  Scissors, 
  Users, 
  User, 
  Package, 
  DollarSign, 
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
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
    },
    { 
      Icon: Scissors, 
      label: 'Atendimentos', 
      link: '/atendimentos',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
    },
    { 
      Icon: Users, 
      label: 'Clientes', 
      link: '/clientes',
      gradient: 'linear-gradient(135deg, #A8E6CF 0%, #56CC9D 100%)'
    },
    { 
      Icon: User, 
      label: 'Profissionais', 
      link: '/profissionais',
      gradient: 'linear-gradient(135deg, #FFD93D 0%, #FFA500 100%)'
    },
    { 
      Icon: Package, 
      label: 'Produtos', 
      link: '/produtos',
      gradient: 'linear-gradient(135deg, #6BCF7F 0%, #4CAF50 100%)'
    },
    { 
      Icon: DollarSign, 
      label: 'Caixa', 
      link: '/caixa',
      gradient: 'linear-gradient(135deg, #95E1D3 0%, #38B2AC 100%)'
    },
    { 
      Icon: Target, 
      label: 'Metas', 
      link: '/profissionais',
      gradient: 'linear-gradient(135deg, #F38181 0%, #E74C3C 100%)'
    },
    { 
      Icon: BarChart3, 
      label: 'Relatórios', 
      link: '/relatorios',
      gradient: 'linear-gradient(135deg, #AA96DA 0%, #9575CD 100%)'
    },
    { 
      Icon: FileText, 
      label: 'Notas Fiscais', 
      link: '/notas-fiscais',
      gradient: 'linear-gradient(135deg, #FCBAD3 0%, #FF6B9D 100%)'
    },
    { 
      Icon: Settings, 
      label: 'Configurações', 
      link: '/configuracoes-fiscal',
      gradient: 'linear-gradient(135deg, #A8DADC 0%, #457B9D 100%)'
    },
    { 
      Icon: UserCog, 
      label: 'Gestão RH', 
      link: '/rh/funcionarios',
      gradient: 'linear-gradient(135deg, #FFB347 0%, #FF8C42 100%)'
    },
    { 
      Icon: CheckCircle, 
      label: 'Confirmações', 
      link: '/confirmacoes',
      gradient: 'linear-gradient(135deg, #90EE90 0%, #32CD32 100%)'
    }
  ];
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3 md:gap-4 lg:gap-5 justify-items-center">
        {atalhos.map((atalho) => {
          const { Icon } = atalho;
          
          return (
            <div
              key={atalho.label}
              onClick={() => navigate(atalho.link)}
              className="atalho-card group cursor-pointer"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: atalho.gradient,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
              }}
            >
              {/* Brilho iOS no topo */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                  borderRadius: '20px 20px 0 0',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Ícone Minimalista */}
              <Icon 
                size={28} 
                color="#FFFFFF" 
                strokeWidth={2}
                style={{
                  marginBottom: '6px',
                  zIndex: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                }}
              />
              
              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textAlign: 'center',
                  zIndex: 1,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  lineHeight: 1.2,
                  padding: '0 4px',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
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
