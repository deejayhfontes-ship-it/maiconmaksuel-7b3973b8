import urllib.request
import json
import ssl

PROJECT = 'hhzvjsrsoyhjzeiuxpep'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
EMAIL = 'maiconmaksuel35@gmail.com'
PASSWORD = 'Maiconapp1010*'
ctx = ssl.create_default_context()

print("=== VERIFICADOR DA TABELA AUDITORIA ===")

# Login
login_body = json.dumps({"email": EMAIL, "password": PASSWORD}).encode()
login_req = urllib.request.Request(
    f'https://{PROJECT}.supabase.co/auth/v1/token?grant_type=password',
    data=login_body, headers={'apikey': ANON_KEY, 'Content-Type': 'application/json'}, method='POST'
)
r = urllib.request.urlopen(login_req, context=ctx, timeout=15)
access_token = json.loads(r.read()).get('access_token', '')
print(f"Login OK! Token obtido.")

# Verificar tabela via REST
print("\nVerificando tabela atendimentos_auditoria...")
check = urllib.request.Request(
    f'https://{PROJECT}.supabase.co/rest/v1/atendimentos_auditoria?limit=0',
    headers={'apikey': ANON_KEY, 'Authorization': f'Bearer {access_token}'}
)
try:
    r = urllib.request.urlopen(check, context=ctx, timeout=10)
    print(f"STATUS {r.status} - Tabela EXISTE! Tudo OK.")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"STATUS {e.code} - Tabela NAO existe.")
    print(f"Detalhe: {body[:200]}")
    print()
    print("SOLUCAO: Copie e execute o SQL abaixo no Supabase SQL Editor:")
    print("URL: https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/sql/new")
    print()
    print("--- SQL ---")
    print("""CREATE TABLE IF NOT EXISTS atendimentos_auditoria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  uuid NOT NULL,
  numero_comanda  integer,
  acao            text NOT NULL,
  motivo          text NOT NULL,
  detalhes        jsonb,
  usuario_nome    text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_atendimento ON atendimentos_auditoria(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON atendimentos_auditoria(created_at DESC);
ALTER TABLE atendimentos_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_auditoria" ON atendimentos_auditoria FOR INSERT WITH CHECK (true);
CREATE POLICY "select_auditoria" ON atendimentos_auditoria FOR SELECT USING (true);""")
