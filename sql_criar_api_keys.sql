-- ==============================================
-- EXECUTE ESTE SQL NO DASHBOARD DO SUPABASE
-- Projeto: dqcvdgugqqvdjxjflwaq
-- URL: https://supabase.com/dashboard/project/dqcvdgugqqvdjxjflwaq/sql/new
-- ==============================================

-- 1. Criar a tabela api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service text NOT NULL UNIQUE,
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Ativar RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 3. Permitir leitura para usuários autenticados e anônimos
CREATE POLICY "Authenticated users can read api_keys"
  ON public.api_keys FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon users can read api_keys"
  ON public.api_keys FOR SELECT TO anon USING (true);

-- 4. Inserir a chave Gemini
INSERT INTO public.api_keys (service, api_key, description)
VALUES ('gemini', 'AIzaSyBbvJd1JKeqbTbLd0MfvDBL-Rd8psMGT1k', 'Google Gemini API Key para geração de imagens do salão')
ON CONFLICT (service) DO UPDATE SET api_key = EXCLUDED.api_key, updated_at = now();
