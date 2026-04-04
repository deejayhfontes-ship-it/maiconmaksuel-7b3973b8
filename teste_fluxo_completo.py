"""
Teste ponta-a-ponta do fluxo de Confirmação Imediata.
"""
import urllib.request
import urllib.error
import json
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

SUPABASE_URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
N8N_WEBHOOK = 'https://n8n.srv1479281.hstgr.cloud/webhook/confirmacao-imediata'

def supa_get(path, params=''):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, context=ctx)
    return json.loads(resp.read().decode())

def webhook_post(payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        N8N_WEBHOOK, data=data, method='POST',
        headers={'Content-Type': 'application/json'}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15, context=ctx)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

print("=" * 60)
print("TESTE PONTA-A-PONTA: Confirmação Imediata via WhatsApp")
print("=" * 60)

print("\n1. Buscando último agendamento com cliente que tem celular...")
agendamentos = supa_get('agendamentos', 'select=id,data_hora,cliente_id,profissional_id,servico_id&order=created_at.desc&limit=10')

agendamento_teste = None
cliente_teste = None

for ag in agendamentos:
    if not ag.get('cliente_id'):
        continue
    clientes = supa_get('clientes', f"id=eq.{ag['cliente_id']}&select=id,nome,celular")
    if clientes and clientes[0].get('celular'):
        agendamento_teste = ag
        cliente_teste = clientes[0]
        break

if not agendamento_teste:
    print("   ❌ Nenhum agendamento com cliente válido encontrado!")
    exit(1)

print(f"   ✅ Agendamento: {agendamento_teste['id']}")
print(f"   ✅ Cliente: {cliente_teste['nome']}")
print(f"   ✅ Celular: {cliente_teste['celular']}")
print(f"   ✅ Data/Hora: {agendamento_teste['data_hora']}")

print("\n2. Limpando logs anteriores deste agendamento (para teste limpo)...")
try:
    url = f"{SUPABASE_URL}/rest/v1/whatsapp_logs?agendamento_id=eq.{agendamento_teste['id']}"
    req = urllib.request.Request(url, method='DELETE', headers={
        'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'
    })
    urllib.request.urlopen(req, context=ctx)
    print("   ✅ Logs limpos")
except Exception as e:
    print(f"   ⚠️ Não conseguiu limpar: {e}")

print("\n3. Enviando payload para o webhook n8n...")
payload = {
    "type": "INSERT",
    "table": "agendamentos",
    "schema": "public",
    "record": agendamento_teste,
    "old_record": None
}

status, resp = webhook_post(payload)
print(f"   URL: {N8N_WEBHOOK}")
print(f"   HTTP Status: {status}")
print(f"   Resposta: {resp[:200]}")

if status in (200, 201):
    print("   ✅ Webhook recebeu e respondeu!")
else:
    print("   ❌ Webhook recusou o payload!")
    print("   Encerrando.")
    exit(1)

print("\n4. Aguardando 8 segundos para o n8n processar...")
time.sleep(8)

print("   Verificando whatsapp_logs...")
logs = supa_get(
    'whatsapp_logs',
    f"agendamento_id=eq.{agendamento_teste['id']}&order=created_at.desc&limit=5"
)

if logs:
    log = logs[0]
    print(f"\n   ✅ LOG ENCONTRADO!")
    print(f"   Status envio:    {log.get('status_envio', '?')}")
    print(f"   Telefone:        {log.get('telefone', '?')}")
    print(f"   Tipo:            {log.get('tipo_mensagem', '?')}")
    if log.get('erro_detalhado'):
        print(f"   ⚠️ Erro:        {log['erro_detalhado'][:200]}")
    if log.get('status_envio') == 'enviado':
        print(f"\n   🎉 SUCESSO TOTAL! Mensagem enviada para {cliente_teste['nome']}!")
    else:
        print(f"\n   ⚠️ Status: {log.get('status_envio')}")
else:
    print("   ❌ Nenhum log criado!")
