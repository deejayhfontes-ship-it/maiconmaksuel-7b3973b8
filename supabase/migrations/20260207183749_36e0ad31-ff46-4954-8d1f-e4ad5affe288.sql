-- Kiosk configuration table
CREATE TABLE public.configuracoes_kiosk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Route settings
  rotas_habilitadas JSONB DEFAULT '{"kiosk": true, "kiosk_caixa": true, "kiosk_comandas": true, "kiosk_agenda": true, "kiosk_ponto": true, "kiosk_espelho": true}'::jsonb,
  ultimo_acesso_rotas JSONB DEFAULT '{}'::jsonb,
  
  -- Window/System lockdown
  bloquear_arraste_janela BOOLEAN DEFAULT true,
  bloquear_posicao_janela BOOLEAN DEFAULT true,
  bloquear_tamanho_janela BOOLEAN DEFAULT true,
  forcar_fullscreen BOOLEAN DEFAULT true,
  ocultar_controles_janela BOOLEAN DEFAULT true,
  bloquear_atalhos_sistema BOOLEAN DEFAULT true,
  auto_relancar_se_fechado BOOLEAN DEFAULT true,
  
  -- Agenda kiosk settings
  agenda_visivel BOOLEAN DEFAULT true,
  agenda_somente_leitura BOOLEAN DEFAULT true,
  agenda_profissionais_visiveis UUID[] DEFAULT '{}',
  agenda_intervalo_tempo TEXT DEFAULT 'hoje',
  agenda_mostrar_nomes_servicos BOOLEAN DEFAULT true,
  agenda_modo_privacidade BOOLEAN DEFAULT false,
  
  -- Ponto (time clock) settings
  ponto_habilitado BOOLEAN DEFAULT true,
  ponto_metodo TEXT DEFAULT 'lista_touch',
  ponto_mostrar_foto_nome BOOLEAN DEFAULT true,
  ponto_requer_confirmacao BOOLEAN DEFAULT true,
  ponto_prevenir_duplicados BOOLEAN DEFAULT true,
  
  -- Content & visual control
  modulo_espelho_caixa BOOLEAN DEFAULT true,
  modulo_comandas_abertas BOOLEAN DEFAULT true,
  modulo_mini_agenda BOOLEAN DEFAULT true,
  modulo_ponto BOOLEAN DEFAULT true,
  modulo_tela_espera BOOLEAN DEFAULT true,
  
  -- Visual settings
  logo_url TEXT,
  logo_animacao TEXT DEFAULT 'none',
  logo_animacao_velocidade INTEGER DEFAULT 1000,
  fundo_tipo TEXT DEFAULT 'color',
  fundo_valor TEXT DEFAULT '#1a1a2e',
  tipografia_grande BOOLEAN DEFAULT true,
  tema_kiosk TEXT DEFAULT 'dark',
  
  -- Interaction rules
  apenas_touch BOOLEAN DEFAULT true,
  desabilitar_teclado BOOLEAN DEFAULT true,
  alvos_touch_grandes BOOLEAN DEFAULT true,
  
  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.configuracoes_kiosk ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Permitir leitura de configuracoes_kiosk" ON public.configuracoes_kiosk FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de configuracoes_kiosk" ON public.configuracoes_kiosk FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de configuracoes_kiosk" ON public.configuracoes_kiosk FOR UPDATE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_configuracoes_kiosk_updated_at
  BEFORE UPDATE ON public.configuracoes_kiosk
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default kiosk configuration
INSERT INTO public.configuracoes_kiosk (id) VALUES (gen_random_uuid());