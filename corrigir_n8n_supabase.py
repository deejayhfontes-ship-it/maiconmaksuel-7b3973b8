"""
Corrige os workflows n8n do Hostgator para usar o Supabase correto.
A API do n8n v1 usa: PUT /api/v1/workflows/:id  com o body completo.
"""
import urllib.request
import urllib.error
import json
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# ── Configurações ──────────────────────────────────────────────────────
N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'

# Supabase CORRETO (atual do projeto)
SUPABASE_URL_NOVO   = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co'
SUPABASE_KEY_NOVO   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'

# Strings antigas que precisam ser substituídas
SUBSTITUCOES = [
    # URLs antigas
    ('https://lzdyzjhqfudsofpcojyi.supabase.co', SUPABASE_URL_NOVO),
    ('lzdyzjhqfudsofpcojyi.supabase.co',          'hhzvjsrsoyhjzeiuxpep.supabase.co'),
    ('https://gqqvdjxjflwaq.supabase.co',          SUPABASE_URL_NOVO),
    ('gqqvdjxjflwaq.supabase.co',                  'hhzvjsrsoyhjzeiuxpep.supabase.co'),
    # Chave anon antiga (lzdyzjhq)
    ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZHl6amhxZnVkc29mcGNvanlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMzEzMTUsImV4cCI6MjA1MDgwNzMxNX0.PmhT_WaQ3uJzWbqVvHs1n0eCHOkFqLSHRGrHknUVXBc',
     SUPABASE_KEY_NOVO),
]

HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(N8N_URL + path, data=data, method=method, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(r, timeout=20, context=ctx)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  !! HTTP {e.code} em {method} {path}: {msg[:200]}")
        raise


print("=" * 60)
print("🔧 CORRIGINDO WORKFLOWS N8N - SUPABASE INCORRETO")
print("=" * 60)

# 1. Listar workflows
print("\n📋 Listando workflows...")
lista = req('GET', '/api/v1/workflows')
workflows = lista.get('data', [])
print(f"   Total: {len(workflows)} workflows\n")

alterados = 0

for wf_resumo in workflows:
    wf_id   = wf_resumo['id']
    wf_name = wf_resumo['name']
    wf_ativo = wf_resumo.get('active', False)

    print(f"─── '{wf_name}' (ID: {wf_id}) | Ativo: {wf_ativo}")

    # Buscar workflow completo
    wf = req('GET', f'/api/v1/workflows/{wf_id}')
    wf_str = json.dumps(wf)

    # Verificar se precisa corrigir
    precisa = any(antigo in wf_str for antigo, _ in SUBSTITUCOES)
    if not precisa:
        print("   ✅ Já usa Supabase correto, pulando.\n")
        continue

    print("   ⚠️  Supabase antigo encontrado! Corrigindo...")

    # Aplicar todas as substituições
    wf_str_novo = wf_str
    for antigo, novo in SUBSTITUCOES:
        if antigo in wf_str_novo:
            print(f"      → Trocando: {antigo[:50]}...")
            wf_str_novo = wf_str_novo.replace(antigo, novo)

    wf_corrigido = json.loads(wf_str_novo)

    # Desativar antes de editar
    if wf_ativo:
        print("   ⏸  Desativando...")
        try:
            req('POST', f'/api/v1/workflows/{wf_id}/deactivate')
        except:
            pass  # Pode falhar se já inativo

    # Salvar workflow corrigido (n8n v1 aceita PUT com body completo)
    print("   💾 Salvando...")
    try:
        req('PUT', f'/api/v1/workflows/{wf_id}', wf_corrigido)
        print("   ✅ Salvo!")
    except Exception as e:
        # Tentar sem campos read-only
        wf_payload = {
            'name':     wf_corrigido.get('name'),
            'nodes':    wf_corrigido.get('nodes', []),
            'connections': wf_corrigido.get('connections', {}),
            'settings': wf_corrigido.get('settings', {}),
        }
        print("   🔄 Tentando payload simplificado...")
        req('PUT', f'/api/v1/workflows/{wf_id}', wf_payload)
        print("   ✅ Salvo (payload simplificado)!")

    # Reativar
    if wf_ativo:
        print("   ▶️  Reativando...")
        try:
            req('POST', f'/api/v1/workflows/{wf_id}/activate')
            print("   ✅ Ativo!\n")
        except Exception as e:
            print(f"   ⚠️  Erro ao reativar: {e}\n")
    else:
        print()

    alterados += 1

print("=" * 60)
if alterados == 0:
    print("ℹ️  Nenhum workflow precisou de correção.")
else:
    print(f"✅ {alterados} workflow(s) corrigido(s) com sucesso!")
print(f"   Supabase ativo: {SUPABASE_URL_NOVO}")
print("=" * 60)
