import urllib.request
import json
import ssl
import sys

# Forçar stdout para UTF-8
sys.stdout.reconfigure(encoding='utf-8')

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

for exec_id in ['963', '962']:
    try:
        exec_data = get(f'/api/v1/executions/{exec_id}')
        data = exec_data.get('data', {})
        res_data = data.get('resultData', {})
        error = res_data.get('error', {})
        run_data = res_data.get('runData', {})
        
        print(f"\n--- EXECUTION {exec_id} ---")
        if error:
            print("ERRO:", error.get('message'))
            print("CAUSA:", error.get('description'))
        else:
            # Procure por erros nos nós
            for node_name, executes in run_data.items():
                for exc in executes:
                    if exc.get('error'):
                        print(f"NODE FAILED: {node_name}")
                        print(f"MESSAGE: {exc['error'].get('message')}")
                        print(f"DESCRIPTION: {exc['error'].get('description')}")
                        
        # Adicionar info do Z-API se falhou nele
        if 'Z-API - Enviar Mensagem' in run_data:
            zapi_node = run_data['Z-API - Enviar Mensagem'][0]
            if zapi_node.get('error'):
                print(f"Z-API ERROR: {json.dumps(zapi_node['data'])}")
                
    except Exception as e:
        print(f"Erro ao buscar execução {exec_id}:", e)
