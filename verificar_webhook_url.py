"""
Descobre a URL correta do webhook do workflow de Confirmacao Imediata
"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY}

WF_ID = 'EbtCBhQ9HRZ1XOCM'

req = urllib.request.Request(f'{N8N_URL}/api/v1/workflows/{WF_ID}', headers=HEADERS)
wf = json.loads(urllib.request.urlopen(req, context=ctx).read().decode())

print(f"Nome: {wf['name']}")
print(f"Ativo: {wf.get('active')}")
print()

for node in wf['nodes']:
    if 'webhook' in node['type'].lower():
        print(f"Node: {node['name']}")
        print(f"  Type: {node['type']}")
        print(f"  TypeVersion: {node.get('typeVersion')}")
        params = node.get('parameters', {})
        print(f"  Path: {params.get('path', '?')}")
        print(f"  Method: {params.get('httpMethod', '?')}")
        wh_id = node.get('webhookId', node.get('id', ''))
        print(f"  WebhookId: {wh_id}")
        print()
        # URLs possiveis
        path = params.get('path', '')
        print(f"  URL teste:     {N8N_URL}/webhook-test/{path}")
        print(f"  URL producao:  {N8N_URL}/webhook/{path}")
        print(f"  URL por ID:    {N8N_URL}/webhook/{wh_id}")

# Tambem tentar listar webhooks ativos se disponível
try:
    req2 = urllib.request.Request(f'{N8N_URL}/api/v1/workflows/{WF_ID}/activate', method='POST', headers={**HEADERS, 'Content-Type': 'application/json'})
    resp2 = urllib.request.urlopen(req2, context=ctx)
    print(f"\nReativacao: {resp2.status}")
except Exception as e:
    print(f"\nStatus ativacao: {e}")
