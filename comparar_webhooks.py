"""
Compara TUDO entre o webhook que funciona e o novo.
Descobre a URL de producao real.
"""
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY}

# IDs dos dois workflows
CHATBOT_ID = 'tcb575OhvvXqagsQ'  # o que funciona
CONFIRM_ID = 'Foumgcf5oWyxGJX6'  # o novo

def get(path):
    r = urllib.request.Request(N8N_URL + path, headers=HEADERS)
    return json.loads(urllib.request.urlopen(r, context=ctx).read().decode())

print("=" * 60)
print("COMPARACAO COMPLETA DOS WEBHOOKS")
print("=" * 60)

for label, wf_id in [("CHATBOT (funciona)", CHATBOT_ID), ("CONFIRMACAO (novo)", CONFIRM_ID)]:
    print(f"\n{'─'*40}")
    print(f"  {label} — ID: {wf_id}")
    print(f"{'─'*40}")
    wf = get(f'/api/v1/workflows/{wf_id}')
    print(f"  active: {wf.get('active')}")
    for node in wf['nodes']:
        if 'webhook' in node['type'].lower():
            print(f"  Node name: {node['name']}")
            print(f"  type: {node['type']}")
            print(f"  typeVersion: {node.get('typeVersion')}")
            print(f"  id: {node.get('id')}")
            print(f"  webhookId: {node.get('webhookId')}")
            params = node.get('parameters', {})
            for k, v in params.items():
                print(f"  params.{k}: {v}")
            print()

# Tenta tambem o endpoint /api/v1/executions pra ver se a execucao existe
print("\n\nUltimas execucoes do workflow de confirmacao:")
try:
    execs = get(f'/api/v1/executions?workflowId={CONFIRM_ID}&limit=3')
    for ex in execs.get('data', []):
        print(f"  exec {ex['id']}: status={ex.get('status')} finished={ex.get('finished')} stoppedAt={ex.get('stoppedAt')}")
except Exception as e:
    print(f"  Erro: {e}")

# Testar o webhook do chatbot pra confirmar que funciona
print("\n\nTestando webhook do CHATBOT (confirmar-agendamento):")
payload = json.dumps({"test": True}).encode()
for path in ['confirmar-agendamento', 'maicon-confirmacao-webhook']:
    url = f'{N8N_URL}/webhook/{path}'
    try:
        r = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type':'application/json'})
        resp = urllib.request.urlopen(r, context=ctx, timeout=5)
        print(f"  ✅ /webhook/{path} -> {resp.status}")
    except Exception as e:
        print(f"  ❌ /webhook/{path} -> {e}")
