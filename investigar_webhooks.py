"""
Investiga a URL do webhook que funciona nos workflows existentes.
Compara com o novo workflow para encontrar o padrao correto.
"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY}

def get(path):
    r = urllib.request.Request(N8N_URL + path, headers=HEADERS)
    return json.loads(urllib.request.urlopen(r, context=ctx).read().decode())

# Listar todos os workflows
wfs = get('/api/v1/workflows')['data']
print("TODOS OS WORKFLOWS E SEUS WEBHOOKS:\n")

for wf in wfs:
    detail = get(f"/api/v1/workflows/{wf['id']}")
    webhooks = [n for n in detail['nodes'] if 'webhook' in n['type'].lower()]
    if webhooks:
        print(f"Workflow: {wf['name']} (ID: {wf['id']}, active: {detail.get('active')})")
        for wh in webhooks:
            print(f"  Node: {wh['name']}")
            print(f"  Type: {wh['type']} v{wh.get('typeVersion')}")
            print(f"  id: {wh.get('id', 'NONE')}")
            print(f"  webhookId: {wh.get('webhookId', 'NONE')}")
            p = wh.get('parameters', {})
            print(f"  path: {p.get('path', 'NONE')}")
            print(f"  httpMethod: {p.get('httpMethod', 'NONE')}")
            print()
