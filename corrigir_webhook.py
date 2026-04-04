"""
Corrige o workflow: remove o ID manual do webhook e deixa o n8n gerar.
Depois busca a URL correta do webhook de producao.
"""
import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}
WF_ID = 'EbtCBhQ9HRZ1XOCM'

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(N8N_URL + path, data=data, method=method, headers=HEADERS)
    resp = urllib.request.urlopen(r, timeout=30, context=ctx)
    return json.loads(resp.read().decode())

# 1. Buscar workflow atual
print("1. Buscando workflow...")
wf = req('GET', f'/api/v1/workflows/{WF_ID}')

# 2. Remover o id manual do node webhook e colocar webhookId gerado
print("2. Corrigindo nodes...")
for node in wf['nodes']:
    # Remover IDs manuais para que o n8n gere automaticamente
    if 'id' in node and node['id'].startswith('ci-'):
        del node['id']

print(f"   Nodes: {[n['name'] for n in wf['nodes']]}")

# 3. Desativar, atualizar e reativar
print("3. Desativando...")
try:
    req('POST', f'/api/v1/workflows/{WF_ID}/deactivate')
except:
    pass

print("4. Atualizando workflow...")
update_body = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf.get('settings', {}),
}
updated = req('PUT', f'/api/v1/workflows/{WF_ID}', update_body)

# 5. Buscar o webhook node atualizado para ver o webhookId gerado
print("5. Buscando webhookId gerado pelo n8n...")
fresh = req('GET', f'/api/v1/workflows/{WF_ID}')
for node in fresh['nodes']:
    if 'webhook' in node['type'].lower():
        wh_id = node.get('webhookId', 'none')
        path = node.get('parameters', {}).get('path', '')
        print(f"   Node: {node['name']}")
        print(f"   webhookId: {wh_id}")
        print(f"   path: {path}")
        print(f"   id: {node.get('id', '?')}")

# 6. Reativar
print("6. Reativando...")
req('POST', f'/api/v1/workflows/{WF_ID}/activate')
print("   ✅ Ativo!")

# 7. Testar todas URLs possiveis
import time
time.sleep(2)

print("\n7. Testando URLs de webhook...")
for node in fresh['nodes']:
    if 'webhook' in node['type'].lower():
        wh_id = node.get('webhookId', '')
        path = node.get('parameters', {}).get('path', '')
        test_urls = []
        if path:
            test_urls.append(f'{N8N_URL}/webhook/{path}')
        if wh_id:
            test_urls.append(f'{N8N_URL}/webhook/{wh_id}')

        for url in test_urls:
            try:
                payload = json.dumps({"test": True, "record": {"id": "test123"}}).encode()
                r = urllib.request.Request(url, data=payload, method='POST',
                                          headers={'Content-Type': 'application/json'})
                resp = urllib.request.urlopen(r, context=ctx, timeout=10)
                print(f"   ✅ {url} -> {resp.status}")
            except urllib.error.HTTPError as e:
                print(f"   ❌ {url} -> {e.code} {e.reason}")
            except Exception as e:
                print(f"   ❌ {url} -> {e}")
