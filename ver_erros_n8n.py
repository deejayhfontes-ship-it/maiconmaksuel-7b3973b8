import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}

def get(path):
    r = urllib.request.Request(N8N_URL + path, headers=HEADERS, method='GET')
    resp = urllib.request.urlopen(r, timeout=20, context=ctx)
    return json.loads(resp.read())

print("Buscando ultimas execuções com erro...")
try:
    executions = get('/api/v1/executions?limit=10&status=error')
    data = executions.get('data', [])
    if not data:
        print("Nenhuma execução falha recente encontrada.")
    for exec_ in data:
        print(f"Workflow ID: {exec_.get('workflowId')}")
        print(f"Execution ID: {exec_.get('id')}")
        print(f"Created At: {exec_.get('createdAt')}")
        print(f"Status: {exec_.get('status')}")
        print("-" * 40)
except Exception as e:
    print("Erro ao buscar execuções:", e)
