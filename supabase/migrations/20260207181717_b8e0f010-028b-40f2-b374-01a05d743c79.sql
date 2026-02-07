-- System settings table for all configurable options
CREATE TABLE public.configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Caixa/PDV Settings
  caixa_valor_abertura_padrao numeric DEFAULT 0,
  caixa_requer_confirmacao_abertura boolean DEFAULT true,
  caixa_requer_confirmacao_fechamento boolean DEFAULT true,
  caixa_permitir_multiplos_abertos boolean DEFAULT false,
  -- Agenda Settings
  agenda_duracao_padrao_minutos integer DEFAULT 30,
  agenda_permitir_encaixe boolean DEFAULT true,
  agenda_horario_inicio time DEFAULT '08:00',
  agenda_horario_fim time DEFAULT '20:00',
  agenda_intervalo_minutos integer DEFAULT 15,
  agenda_dias_antecedencia_max integer DEFAULT 60,
  -- Services/Products Settings
  servicos_comissao_padrao numeric DEFAULT 30,
  produtos_comissao_padrao numeric DEFAULT 10,
  produtos_alerta_estoque_minimo integer DEFAULT 5,
  produtos_vendas_habilitadas boolean DEFAULT true,
  -- Device Settings
  dispositivo_modo_padrao text DEFAULT 'auto',
  -- Backup Settings
  backup_ultimo_data timestamp with time zone,
  backup_ultimo_tamanho_bytes bigint,
  backup_ultimo_integridade boolean,
  backup_modulos_selecionados text[] DEFAULT ARRAY['clientes', 'agendamentos', 'financeiro', 'produtos', 'estoque', 'profissionais', 'servicos', 'configuracoes'],
  backup_formato_padrao text DEFAULT 'zip',
  backup_criptografado boolean DEFAULT false,
  -- System Info
  versao_atual text DEFAULT '1.0.0',
  ambiente text DEFAULT 'production',
  -- Timestamps
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can read, but system controls writes
CREATE POLICY "Permitir leitura de configuracoes_sistema"
  ON public.configuracoes_sistema FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de configuracoes_sistema"
  ON public.configuracoes_sistema FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de configuracoes_sistema"
  ON public.configuracoes_sistema FOR UPDATE
  USING (true);

-- Device registry table for tracking registered devices
CREATE TABLE public.dispositivos_registrados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'auto', -- 'admin', 'notebook', 'kiosk', 'auto'
  ultimo_acesso timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.dispositivos_registrados ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Permitir leitura de dispositivos_registrados"
  ON public.dispositivos_registrados FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de dispositivos_registrados"
  ON public.dispositivos_registrados FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de dispositivos_registrados"
  ON public.dispositivos_registrados FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão de dispositivos_registrados"
  ON public.dispositivos_registrados FOR DELETE
  USING (true);

-- Insert default settings row
INSERT INTO public.configuracoes_sistema (id) VALUES (gen_random_uuid());

-- Add updated_at trigger
CREATE TRIGGER update_configuracoes_sistema_updated_at
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispositivos_registrados_updated_at
  BEFORE UPDATE ON public.dispositivos_registrados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();