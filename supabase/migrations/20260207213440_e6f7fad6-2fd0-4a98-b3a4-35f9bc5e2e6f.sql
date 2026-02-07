-- Create enum for report types
CREATE TYPE report_category AS ENUM (
  'vendas',
  'clientes', 
  'profissionais',
  'estoque',
  'financeiro',
  'crediario',
  'caixa',
  'consolidado'
);

-- Create reports history table
CREATE TABLE public.relatorios_gerados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type report_category NOT NULL,
  report_subtype TEXT NOT NULL,
  title TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by TEXT NOT NULL DEFAULT 'sistema',
  filters_applied JSONB DEFAULT '{}',
  total_records INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  pdf_path TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'failed', 'pending_sync')),
  synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios_gerados ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (reports are shared within the salon)
CREATE POLICY "Anyone can view reports"
  ON public.relatorios_gerados FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reports"
  ON public.relatorios_gerados FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update reports"
  ON public.relatorios_gerados FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete reports"
  ON public.relatorios_gerados FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_relatorios_gerados_updated_at
  BEFORE UPDATE ON public.relatorios_gerados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_relatorios_gerados_type ON public.relatorios_gerados(report_type);
CREATE INDEX idx_relatorios_gerados_generated_at ON public.relatorios_gerados(generated_at DESC);
CREATE INDEX idx_relatorios_gerados_status ON public.relatorios_gerados(status);

-- Create storage bucket for report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios-pdfs', 'relatorios-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDF bucket
CREATE POLICY "Anyone can view report PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'relatorios-pdfs');

CREATE POLICY "Anyone can upload report PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'relatorios-pdfs');

CREATE POLICY "Anyone can update report PDFs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'relatorios-pdfs');

CREATE POLICY "Anyone can delete report PDFs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'relatorios-pdfs');