import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, ArrowLeft, Calendar, Users, Scissors, Package, 
  DollarSign, FileText, Settings, BarChart3, Clock, CreditCard,
  UserCog, Building2, Bell, MessageSquare, Database, Shield,
  Smartphone, Receipt, Wallet, TrendingUp, ClipboardList, Key,
  Lock, Wifi, Printer, HardDrive, Upload, Trash2, Eye, Edit,
  Plus, Search, Filter, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Mail, Phone, MapPin, Camera, Palette, Globe, Zap, Server, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef, useState } from "react";

export default function MapaSistema() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Captura o conteúdo em alta resolução
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Configuração do PDF A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      
      // Calcula a altura proporcional da imagem
      const ratio = contentWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      // Altura disponível por página (deixando espaço para margem e rodapé)
      const pageContentHeight = pdfHeight - margin - 15;
      
      // Número de páginas necessárias
      const totalPages = Math.ceil(scaledHeight / pageContentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calcula a posição Y para esta página
        const srcY = (page * pageContentHeight) / ratio;
        const srcHeight = Math.min(pageContentHeight / ratio, imgHeight - srcY);
        
        // Cria um canvas temporário para esta página
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, srcY,
            imgWidth, srcHeight,
            0, 0,
            imgWidth, srcHeight
          );
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const pageScaledHeight = srcHeight * ratio;
          
          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, pageScaledHeight);
        }
        
        // Adiciona rodapé
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(
          `Página ${page + 1} de ${totalPages}`,
          pdfWidth / 2,
          pdfHeight - 5,
          { align: 'center' }
        );
      }

      pdf.save('mapa-sistema-completo.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const modulos = [
    {
      titulo: "Agenda",
      icone: Calendar,
      cor: "bg-blue-500",
      rota: "/agenda",
      descricao: "Gerenciamento de agendamentos",
      funcionalidades: [
        "Visualização por dia/semana/mês",
        "Agendamento por profissional",
        "Confirmação via WhatsApp",
        "Bloqueio de horários",
        "Lembretes automáticos",
        "Cores por profissional",
        "Drag and drop para reagendar"
      ]
    },
    {
      titulo: "Atendimentos",
      icone: Scissors,
      cor: "bg-purple-500",
      rota: "/atendimentos",
      descricao: "Gestão de comandas e serviços",
      funcionalidades: [
        "Abertura de comandas",
        "Adição de serviços e produtos",
        "Desconto e gorjetas",
        "Fechamento com múltiplas formas",
        "Integração com tablet cliente",
        "Histórico por cliente",
        "Emissão de nota fiscal"
      ]
    },
    {
      titulo: "Clientes",
      icone: Users,
      cor: "bg-green-500",
      rota: "/clientes",
      descricao: "Cadastro e histórico de clientes",
      funcionalidades: [
        "Cadastro completo com foto",
        "Histórico de visitas",
        "Crédito/Fiado",
        "Aniversariantes",
        "Preferências e observações",
        "CPF e dados fiscais",
        "Limite de crediário"
      ]
    },
    {
      titulo: "Profissionais",
      icone: UserCog,
      cor: "bg-amber-500",
      rota: "/profissionais",
      descricao: "Gestão da equipe",
      funcionalidades: [
        "Cadastro com comissões",
        "Comissão por serviço/produto",
        "Metas individuais",
        "Vales e adiantamentos",
        "Histórico de atendimentos",
        "Fechamento semanal",
        "Cor na agenda"
      ]
    },
    {
      titulo: "Serviços",
      icone: ClipboardList,
      cor: "bg-pink-500",
      rota: "/servicos",
      descricao: "Catálogo de serviços",
      funcionalidades: [
        "Categorias de serviços",
        "Preços e duração",
        "Comissão por serviço",
        "Serviços ativos/inativos",
        "Descrição detalhada"
      ]
    },
    {
      titulo: "Produtos",
      icone: Package,
      cor: "bg-orange-500",
      rota: "/produtos",
      descricao: "Estoque e vendas",
      funcionalidades: [
        "Controle de estoque",
        "Estoque mínimo com alertas",
        "Categorias",
        "Código de barras",
        "Preço custo/venda",
        "Foto do produto",
        "Margem de lucro"
      ]
    },
    {
      titulo: "Caixa",
      icone: DollarSign,
      cor: "bg-emerald-500",
      rota: "/caixa",
      descricao: "Controle financeiro diário",
      funcionalidades: [
        "Abertura/fechamento de caixa",
        "Comandas abertas",
        "Sangrias e suprimentos",
        "Cheques a compensar",
        "Gorjetas",
        "Dívidas/Fiado",
        "PDV simplificado",
        "Extrato detalhado"
      ],
      subRotas: [
        { rota: "/caixa/extrato", nome: "Extrato" },
        { rota: "/caixa/comandas", nome: "Comandas" },
        { rota: "/caixa/dividas", nome: "Dívidas" },
        { rota: "/caixa/gorjetas", nome: "Gorjetas" },
        { rota: "/caixa/historico", nome: "Histórico" },
        { rota: "/caixa/gaveta", nome: "Gaveta" },
        { rota: "/caixa/fechar", nome: "Fechar" },
        { rota: "/caixa/pdv", nome: "PDV" }
      ]
    },
    {
      titulo: "Financeiro",
      icone: Wallet,
      cor: "bg-cyan-500",
      rota: "/financeiro",
      descricao: "Contas a pagar e receber",
      funcionalidades: [
        "Contas a pagar",
        "Contas a receber",
        "Despesas por categoria",
        "Fluxo de caixa",
        "Vales de profissionais",
        "Fechamento semanal"
      ],
      subRotas: [
        { rota: "/financeiro/vales", nome: "Vales" },
        { rota: "/financeiro/fechamento-semanal", nome: "Fechamento" },
        { rota: "/financeiro/dividas", nome: "Dívidas" },
        { rota: "/financeiro/cheques", nome: "Cheques" }
      ]
    },
    {
      titulo: "Notas Fiscais",
      icone: FileText,
      cor: "bg-slate-500",
      rota: "/notas-fiscais",
      descricao: "Emissão de NF-e e NFC-e",
      funcionalidades: [
        "Emissão automática",
        "NF-e e NFC-e",
        "Envio por email/SMS",
        "Consulta e cancelamento",
        "Download XML/PDF",
        "Histórico completo"
      ]
    },
    {
      titulo: "Relatórios",
      icone: BarChart3,
      cor: "bg-indigo-500",
      rota: "/relatorios",
      descricao: "Análises e estatísticas",
      funcionalidades: [
        "Faturamento por período",
        "Desempenho profissionais",
        "Produtos mais vendidos",
        "Serviços mais realizados",
        "Relatório completo",
        "Exportação PDF/Excel",
        "Gráficos interativos"
      ]
    },
    {
      titulo: "Metas",
      icone: TrendingUp,
      cor: "bg-rose-500",
      rota: "/configuracoes/metas",
      descricao: "Gestão de metas do salão",
      funcionalidades: [
        "Metas mensais/semanais",
        "Acompanhamento em tempo real",
        "Alertas de progresso (50%, 75%, 100%)",
        "Metas por profissional",
        "Cálculo automático",
        "Histórico de metas"
      ]
    },
    {
      titulo: "RH - Gestão de Pessoas",
      icone: Building2,
      cor: "bg-violet-500",
      rota: "/gestao-rh",
      descricao: "Gestão completa de funcionários",
      funcionalidades: [
        "Cadastro CLT/PJ/Autônomo",
        "Folha de pagamento",
        "Férias e 13º salário",
        "Documentos digitalizados",
        "Ocorrências e advertências",
        "Benefícios (VT, VR, Plano)",
        "Dados bancários",
        "Jornada de trabalho"
      ]
    },
    {
      titulo: "Ponto Eletrônico",
      icone: Clock,
      cor: "bg-teal-500",
      rota: "/ponto",
      descricao: "Controle de jornada",
      funcionalidades: [
        "Registro de ponto",
        "Entrada/Saída/Almoço",
        "Horas trabalhadas",
        "Faltas e atrasos",
        "Justificativas",
        "Relatório mensal",
        "Atestados médicos"
      ]
    },
    {
      titulo: "Fechamento Semanal",
      icone: Receipt,
      cor: "bg-lime-600",
      rota: "/financeiro/fechamento-semanal",
      descricao: "Acerto com profissionais",
      funcionalidades: [
        "Resumo semanal por profissional",
        "Comissões calculadas",
        "Vales descontados",
        "Gorjetas acumuladas",
        "Confirmação de pagamento",
        "Histórico de fechamentos",
        "Reabrir fechamento"
      ]
    },
    {
      titulo: "Tablet Cliente",
      icone: Smartphone,
      cor: "bg-fuchsia-500",
      rota: "/tablet/cliente",
      descricao: "Tela para cliente",
      funcionalidades: [
        "Exibição de comanda em tempo real",
        "Forma de pagamento selecionada",
        "Ponto eletrônico de profissionais",
        "Logo animada em espera",
        "Agradecimento personalizado",
        "Broadcast channel sync"
      ]
    },
  ];

  const configuracoes = [
    {
      titulo: "Configurações Gerais",
      icone: Settings,
      rota: "/configuracoes",
      itens: [
        "Dados da empresa",
        "Logo e branding",
        "Tema claro/escuro",
        "Backup manual",
        "Backup automático",
        "Restaurar backup",
        "Limpar dados",
        "Importar dados",
        "Exportar dados",
        "Diagnóstico do sistema",
        "Configuração de webcam"
      ]
    },
    {
      titulo: "Configurações Fiscais",
      icone: FileText,
      rota: "/configuracoes/fiscal",
      itens: [
        "Dados da empresa (CNPJ, IE, IM)",
        "Endereço completo",
        "Regime tributário",
        "Certificado digital",
        "Ambiente (Produção/Homologação)",
        "Série e número NF-e/NFC-e",
        "CFOP produtos/serviços",
        "Alíquotas ICMS/ISS",
        "Emissão automática",
        "Auto-emitir para CPF/CNPJ",
        "Envio automático por email",
        "Dias permitidos para emissão",
        "API Provider (Focus NFe, etc)"
      ]
    },
    {
      titulo: "Configurações WhatsApp",
      icone: MessageSquare,
      rota: "/configuracoes/whatsapp",
      itens: [
        "Conexão via QR Code",
        "Número do WhatsApp",
        "API Provider",
        "Status da sessão",
        "Templates de mensagens",
        "Confirmação de agendamento",
        "Lembretes automáticos",
        "Mensagem de aniversário",
        "Cobrança de dívidas",
        "Variáveis dinâmicas"
      ]
    },
    {
      titulo: "Notificações",
      icone: Bell,
      rota: "/configuracoes/notificacoes",
      itens: [
        "Notificações push",
        "Alertas de estoque baixo",
        "Lembretes de agendamentos",
        "Notificações de pagamentos",
        "Sons de alerta"
      ]
    },
    {
      titulo: "Integrações",
      icone: Zap,
      rota: "/configuracoes/integracoes",
      itens: [
        "WhatsApp Business API",
        "Focus NFe",
        "Outras APIs fiscais",
        "Webhooks"
      ]
    },
    {
      titulo: "Caixa e PDV",
      icone: CreditCard,
      rota: "/configuracoes/caixa-pdv",
      itens: [
        "Formas de pagamento",
        "Taxas de cartão",
        "Impressora de cupom",
        "Gaveta de dinheiro",
        "Layout do PDV"
      ]
    },
    {
      titulo: "Taxa de Falta",
      icone: AlertTriangle,
      rota: "/configuracoes/taxa-falta",
      itens: [
        "Cobrar taxa de falta",
        "Valor da taxa",
        "Prazo de confirmação",
        "Prazo mínimo cancelamento",
        "Comportamento sem confirmação",
        "Comportamento cancelamento tardio",
        "Horário de envio",
        "Tentativas de reenvio",
        "Notificações automáticas"
      ]
    }
  ];

  const tabelasBanco = [
    { nome: "profiles", descricao: "Usuários do sistema" },
    { nome: "agendamentos", descricao: "Horários agendados" },
    { nome: "confirmacoes_agendamento", descricao: "Confirmações via link" },
    { nome: "atendimentos", descricao: "Comandas/atendimentos" },
    { nome: "atendimento_servicos", descricao: "Serviços por comanda" },
    { nome: "atendimento_produtos", descricao: "Produtos por comanda" },
    { nome: "pagamentos", descricao: "Pagamentos recebidos" },
    { nome: "clientes", descricao: "Cadastro de clientes" },
    { nome: "profissionais", descricao: "Profissionais do salão" },
    { nome: "profissional_metas_historico", descricao: "Histórico de metas" },
    { nome: "servicos", descricao: "Catálogo de serviços" },
    { nome: "produtos", descricao: "Estoque de produtos" },
    { nome: "caixa", descricao: "Caixas abertos/fechados" },
    { nome: "caixa_movimentacoes", descricao: "Movimentações do caixa" },
    { nome: "despesas_rapidas", descricao: "Despesas do dia" },
    { nome: "dividas", descricao: "Fiado/crédito clientes" },
    { nome: "dividas_pagamentos", descricao: "Pagamentos de dívidas" },
    { nome: "gorjetas", descricao: "Gorjetas profissionais" },
    { nome: "vales", descricao: "Vales/adiantamentos" },
    { nome: "cheques", descricao: "Cheques a compensar" },
    { nome: "notas_fiscais", descricao: "Notas fiscais emitidas" },
    { nome: "itens_nota_fiscal", descricao: "Itens das notas" },
    { nome: "contas_pagar", descricao: "Contas a pagar" },
    { nome: "contas_receber", descricao: "Contas a receber" },
    { nome: "funcionarios", descricao: "Funcionários CLT/PJ" },
    { nome: "ponto_funcionarios", descricao: "Ponto de funcionários" },
    { nome: "ponto_registros", descricao: "Registros de ponto geral" },
    { nome: "ferias_funcionarios", descricao: "Férias de funcionários" },
    { nome: "folhas_pagamento", descricao: "Folhas de pagamento" },
    { nome: "itens_folha_pagamento", descricao: "Itens da folha" },
    { nome: "documentos_funcionarios", descricao: "Documentos digitais" },
    { nome: "ocorrencias_funcionarios", descricao: "Ocorrências/advertências" },
    { nome: "fechamentos_semanais", descricao: "Fechamentos semanais" },
    { nome: "fechamentos_profissionais", descricao: "Fechamento por profissional" },
    { nome: "metas", descricao: "Metas do salão" },
    { nome: "metas_progresso", descricao: "Progresso das metas" },
    { nome: "configuracoes_fiscal", descricao: "Config. fiscal" },
    { nome: "configuracoes_whatsapp", descricao: "Config. WhatsApp" },
    { nome: "configuracoes_taxa_falta", descricao: "Config. taxa de falta" },
    { nome: "mensagens_templates", descricao: "Templates de mensagens" },
    { nome: "mensagens_enviadas", descricao: "Histórico de mensagens" },
    { nome: "import_logs", descricao: "Logs de importação" },
  ];

  const acoesDisponiveis = [
    { icone: Plus, nome: "Adicionar", descricao: "Criar novos registros" },
    { icone: Edit, nome: "Editar", descricao: "Modificar registros existentes" },
    { icone: Trash2, nome: "Excluir", descricao: "Remover registros" },
    { icone: Eye, nome: "Visualizar", descricao: "Ver detalhes completos" },
    { icone: Search, nome: "Buscar", descricao: "Pesquisar registros" },
    { icone: Filter, nome: "Filtrar", descricao: "Filtrar por critérios" },
    { icone: Download, nome: "Exportar", descricao: "Baixar em PDF/Excel" },
    { icone: Upload, nome: "Importar", descricao: "Carregar dados externos" },
    { icone: RefreshCw, nome: "Atualizar", descricao: "Recarregar dados" },
    { icone: Printer, nome: "Imprimir", descricao: "Imprimir relatórios" },
  ];

  const formasPagamento = [
    "Dinheiro",
    "PIX",
    "Cartão de Débito",
    "Cartão de Crédito (1x a 12x)",
    "Cheque",
    "Fiado/Crediário",
    "Múltiplas formas",
    "Vale presente"
  ];

  const statusSistema = [
    { status: "agendamento", valores: ["agendado", "confirmado", "cancelado", "realizado", "falta"] },
    { status: "atendimento", valores: ["aberto", "em_atendimento", "fechado", "cancelado"] },
    { status: "caixa", valores: ["aberto", "fechado"] },
    { status: "divida", valores: ["pendente", "parcial", "pago", "cancelado"] },
    { status: "cheque", valores: ["pendente", "compensado", "devolvido"] },
    { status: "nota_fiscal", valores: ["pendente", "autorizada", "cancelada", "rejeitada"] },
    { status: "fechamento", valores: ["aberto", "fechado", "pago"] },
    { status: "vale", valores: ["pendente", "quitado", "cancelado"] },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mapa Completo do Sistema</h1>
        </div>
        <Button onClick={handleExportPDF} className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>

      {/* Conteúdo exportável */}
      <div ref={contentRef} className="p-8 bg-white">
        {/* Cabeçalho do documento */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Gestão para Salão de Beleza
          </h1>
          <p className="text-lg text-gray-600">Documentação Completa de Funcionalidades</p>
          <p className="text-sm text-gray-400 mt-1">
            Gerado em: {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <Separator className="my-6" />

        {/* Módulos Principais */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Módulos do Sistema ({modulos.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((modulo) => {
              const Icone = modulo.icone;
              return (
                <Card key={modulo.rota} className="border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${modulo.cor} text-white`}>
                        <Icone className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{modulo.titulo}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {modulo.rota}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {modulo.descricao}
                    </p>
                    <ul className="text-xs space-y-1">
                      {modulo.funcionalidades.map((func, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {func}
                        </li>
                      ))}
                    </ul>
                    {modulo.subRotas && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Sub-páginas:</p>
                        <div className="flex flex-wrap gap-1">
                          {modulo.subRotas.map((sub, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {sub.nome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Configurações Detalhadas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do Sistema
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configuracoes.map((config) => {
              const Icone = config.icone;
              return (
                <Card key={config.rota} className="border-2 border-gray-200">
                  <CardHeader className="pb-2 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Icone className="h-5 w-5 text-gray-600" />
                      <div>
                        <CardTitle className="text-base">{config.titulo}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {config.rota}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <ul className="text-xs space-y-1 columns-2">
                      {config.itens.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 break-inside-avoid">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Banco de Dados */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6" />
            Estrutura do Banco de Dados ({tabelasBanco.length} tabelas)
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tabelasBanco.map((tabela) => (
              <div 
                key={tabela.nome}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <p className="font-mono text-sm font-medium text-primary">
                  {tabela.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tabela.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Ações Disponíveis */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Ações Disponíveis no Sistema
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {acoesDisponiveis.map((acao) => {
              const Icone = acao.icone;
              return (
                <div key={acao.nome} className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                  <Icone className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium text-sm">{acao.nome}</p>
                  <p className="text-xs text-gray-500">{acao.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Formas de Pagamento */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Formas de Pagamento Aceitas
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {formasPagamento.map((forma) => (
              <Badge key={forma} className="bg-emerald-100 text-emerald-800 px-3 py-1">
                {forma}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Status do Sistema */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Status e Estados do Sistema
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusSistema.map((item) => (
              <div key={item.status} className="p-3 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-sm mb-2 capitalize">{item.status.replace('_', ' ')}</p>
                <div className="flex flex-wrap gap-1">
                  {item.valores.map((valor) => (
                    <Badge key={valor} variant="outline" className="text-xs">
                      {valor}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Integrações */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Integrações e Recursos Externos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  WhatsApp Business
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Confirmação de agendamentos</li>
                  <li>• Lembretes automáticos (24h antes)</li>
                  <li>• Envio de recibos</li>
                  <li>• Cobrança de dívidas</li>
                  <li>• Mensagens de aniversário</li>
                  <li>• Taxa de falta automática</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Nota Fiscal Eletrônica
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• NF-e (Nota Fiscal Eletrônica)</li>
                  <li>• NFC-e (Cupom Fiscal)</li>
                  <li>• Emissão automática</li>
                  <li>• Envio por email/SMS</li>
                  <li>• Download XML/PDF</li>
                  <li>• Integração Focus NFe</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-purple-500" />
                  Tablet Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Tela de espera com logo animada</li>
                  <li>• Exibição da comanda em tempo real</li>
                  <li>• Forma de pagamento selecionada</li>
                  <li>• Ponto eletrônico integrado</li>
                  <li>• Broadcast channel (sync)</li>
                  <li>• Tela de agradecimento</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Fluxos Principais */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Fluxos Principais
          </h2>
          
          {/* Fluxo de Atendimento */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">1. Fluxo de Atendimento</h3>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
              {[
                { texto: "Agendamento", cor: "bg-blue-500" },
                { texto: "→", cor: "" },
                { texto: "Confirmação WhatsApp", cor: "bg-green-500" },
                { texto: "→", cor: "" },
                { texto: "Check-in Cliente", cor: "bg-teal-500" },
                { texto: "→", cor: "" },
                { texto: "Abrir Comanda", cor: "bg-purple-500" },
                { texto: "→", cor: "" },
                { texto: "Serviços/Produtos", cor: "bg-pink-500" },
                { texto: "→", cor: "" },
                { texto: "Fechar Comanda", cor: "bg-amber-500" },
                { texto: "→", cor: "" },
                { texto: "Pagamento", cor: "bg-emerald-500" },
                { texto: "→", cor: "" },
                { texto: "Nota Fiscal", cor: "bg-slate-500" },
              ].map((item, idx) => (
                item.cor ? (
                  <Badge key={idx} className={`${item.cor} text-white px-3 py-1`}>
                    {item.texto}
                  </Badge>
                ) : (
                  <span key={idx} className="text-gray-400 font-bold">{item.texto}</span>
                )
              ))}
            </div>
          </div>

          {/* Fluxo Financeiro */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">2. Fluxo Financeiro Semanal</h3>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
              {[
                { texto: "Atendimentos", cor: "bg-purple-500" },
                { texto: "→", cor: "" },
                { texto: "Calcular Comissões", cor: "bg-orange-500" },
                { texto: "→", cor: "" },
                { texto: "Descontar Vales", cor: "bg-red-500" },
                { texto: "→", cor: "" },
                { texto: "Adicionar Gorjetas", cor: "bg-yellow-500" },
                { texto: "→", cor: "" },
                { texto: "Fechamento Semanal", cor: "bg-lime-600" },
                { texto: "→", cor: "" },
                { texto: "Pagamento", cor: "bg-emerald-500" },
              ].map((item, idx) => (
                item.cor ? (
                  <Badge key={idx} className={`${item.cor} text-white px-3 py-1`}>
                    {item.texto}
                  </Badge>
                ) : (
                  <span key={idx} className="text-gray-400 font-bold">{item.texto}</span>
                )
              ))}
            </div>
          </div>

          {/* Fluxo de Caixa */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">3. Fluxo de Caixa</h3>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
              {[
                { texto: "Abrir Caixa", cor: "bg-green-500" },
                { texto: "→", cor: "" },
                { texto: "Receber Pagamentos", cor: "bg-blue-500" },
                { texto: "→", cor: "" },
                { texto: "Sangrias/Suprimentos", cor: "bg-orange-500" },
                { texto: "→", cor: "" },
                { texto: "Conferir Cheques", cor: "bg-yellow-500" },
                { texto: "→", cor: "" },
                { texto: "Fechar Caixa", cor: "bg-red-500" },
                { texto: "→", cor: "" },
                { texto: "Conferência", cor: "bg-slate-500" },
              ].map((item, idx) => (
                item.cor ? (
                  <Badge key={idx} className={`${item.cor} text-white px-3 py-1`}>
                    {item.texto}
                  </Badge>
                ) : (
                  <span key={idx} className="text-gray-400 font-bold">{item.texto}</span>
                )
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Recursos de Segurança */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6" />
            Recursos de Segurança
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Key className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-green-800">Autenticação</h3>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Login com email/senha</li>
                <li>• Recuperação de senha</li>
                <li>• Sessão segura</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Shield className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold text-blue-800">Proteção de Dados</h3>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• RLS (Row Level Security)</li>
                <li>• Criptografia de senhas</li>
                <li>• Backup automático</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Server className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-purple-800">Infraestrutura</h3>
              <ul className="text-sm text-purple-700 mt-2 space-y-1">
                <li>• Supabase (PostgreSQL)</li>
                <li>• Edge Functions</li>
                <li>• CDN global</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-400">
          <p className="font-semibold text-gray-600">Sistema de Gestão para Salão de Beleza - Maicon Maksuel Concept</p>
          <p>Desenvolvido com Lovable • {new Date().getFullYear()}</p>
          <p className="mt-2 text-xs">
            Total: {modulos.length} módulos • {tabelasBanco.length} tabelas • {configuracoes.length} áreas de configuração
          </p>
        </div>
      </div>
    </div>
  );
}
