"""
Diagnostico completo de webhooks do n8n.
Testa vários caminhos e configurações.
"""
import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'

# Teste 1: /healthz
print("1. Health check:")
try:
    r = urllib.request.urlopen(urllib.request.Request(f'{N8N_URL}/healthz'), context=ctx, timeout=5)
    print(f"   ✅ /healthz -> {r.status}: {r.read().decode()[:100]}")
except Exception as e:
    print(f"   ❌ /healthz -> {e}")

# Teste 2: /webhook/ (com barra)
print("\n2. Testando /webhook/ paths:")
paths_to_test = [
    '/webhook/confirmacao-imediata',
    '/webhook/confirmar-agendamento',
    '/webhook/maicon-confirmacao-webhook',
    '/webhook/confirmacao-imediata-webhook',
    '/api/webhook/confirmacao-imediata',
    '/n8n/webhook/confirmacao-imediata',
]

payload = json.dumps({"test": True}).encode()
for path in paths_to_test:
    url = f'{N8N_URL}{path}'
    try:
        r = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type': 'application/json'})
        resp = urllib.request.urlopen(r, context=ctx, timeout=5)
        body = resp.read().decode()[:200]
        print(f"   ✅ {path} -> {resp.status}: {body}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:100]
        print(f"   ❌ {path} -> {e.code}: {body}")
    except Exception as e:
        print(f"   ❌ {path} -> {e}")

# Teste 3: /webhook-waiting
print("\n3. Testando /webhook-waiting:")
try:
    url = f'{N8N_URL}/webhook-waiting/confirmacao-imediata'
    r = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(r, context=ctx, timeout=5)
    print(f"   ✅ -> {resp.status}")
except Exception as e:
    print(f"   ❌ -> {e}")

# Teste 4: Verificar se o n8n logou alguma execucao (qualquer uma)
print("\n4. Ultimas execucoes de QUALQUER workflow:")
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
try:
    r = urllib.request.Request(f'{N8N_URL}/api/v1/executions?limit=5', headers={'X-N8N-API-KEY': N8N_KEY})
    resp = urllib.request.urlopen(r, context=ctx, timeout=10)
    data = json.loads(resp.read().decode())
    for ex in data.get('data', []):
        print(f"   exec {ex['id']}: wf={ex.get('workflowId')} status={ex.get('status')} finished={ex.get('finished')} stoppedAt={ex.get('stoppedAt','?')}")
except Exception as e:
    print(f"   ❌ {e}")

# Teste 5: checar variáveis de ambiente WEBHOOK_URL
print("\n5. Testando se existe WEBHOOK_URL custom no n8n...")
# Algumas instancias n8n definem N8N_WEBHOOK_URL diferente do N8N_HOST
# Vamos tentar acessar /rest/settings
try:
    r = urllib.request.Request(f'{N8N_URL}/api/v1/settings', headers={'X-N8N-API-KEY': N8N_KEY})
    resp = urllib.request.urlopen(r, context=ctx, timeout=10)
    settings = json.loads(resp.read().decode())
    # Procurar por webhook url
    for key in ['webhookUrl', 'webhook', 'N8N_WEBHOOK_URL', 'urlBaseWebhook']:
        if key in settings:
            print(f"   {key}: {settings[key]}")
    # Imprimir todas as chaves pra debug
    print(f"   Settings keys: {list(settings.keys())[:20]}")
except urllib.error.HTTPError as e:
    print(f"   ❌ HTTP {e.code}")
except Exception as e:
    print(f"   ❌ {e}")
