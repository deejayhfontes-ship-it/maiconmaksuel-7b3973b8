"""
Atualiza o node webhook do workflow para ter um webhookId definido.
"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}

WF_ID = 'Foumgcf5oWyxGJX6'

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(N8N_URL + path, data=data, method=method, headers=HEADERS)
    resp = urllib.request.urlopen(r, timeout=30, context=ctx)
    return json.loads(resp.read().decode())

# 1. Desativar
print("1. Desativando...")
try: req('POST', f'/api/v1/workflows/{WF_ID}/deactivate')
except: pass

# 2. Buscar workflow
print("2. Buscando workflow...")
wf = req('GET', f'/api/v1/workflows/{WF_ID}')

# 3. Setar webhookId no node webhook
print("3. Setando webhookId...")
for node in wf['nodes']:
    if 'webhook' in node['type'].lower():
        node['webhookId'] = 'confirmacao-imediata-webhook'
        print(f"   Node '{node['name']}' -> webhookId = 'confirmacao-imediata-webhook'")

# 4. Atualizar
print("4. Atualizando...")
update = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf.get('settings', {}),
}
req('PUT', f'/api/v1/workflows/{WF_ID}', update)

# 5. Reativar
print("5. Reativando...")
req('POST', f'/api/v1/workflows/{WF_ID}/activate')
print("   ATIVO!")

# 6. Testar
import time
time.sleep(2)

print("\n6. Testando webhook...")
# Na instancia do Maicon, os webhooks usam o path do parametro
urls_to_test = [
    f'{N8N_URL}/webhook/confirmacao-imediata',
    f'{N8N_URL}/webhook/confirmacao-imediata-webhook',
]

payload = json.dumps({"type":"INSERT","record":{"id":"test-abc"}}).encode()
for url in urls_to_test:
    try:
        r = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type':'application/json'})
        resp = urllib.request.urlopen(r, context=ctx, timeout=10)
        print(f"   ✅ {url.split('/')[-1]} -> {resp.status}")
    except Exception as e:
        print(f"   ❌ {url.split('/')[-1]} -> {e}")
