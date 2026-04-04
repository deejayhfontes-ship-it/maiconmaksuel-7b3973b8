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

print("Buscando detalhes do erro na execucao 963 e 962...")

for exec_id in ['963', '962']:
    try:
        exec_data = get(f'/api/v1/executions/{exec_id}')
        print(f"\n--- EXECUTION {exec_id} ---")
        
        # O n8n tem os dados da execução dentro de `data`
        # Precisamos achar onde o nó falhou.
        data = exec_data.get('data', {})
        res_data = data.get('resultData', {})
        error = res_data.get('error', {})
        
        if error:
            print("ERRO:", error.get('message'))
            print("NODE:", error.get('node', {}).get('name'))
            print("CAUSA:", error.get('description'))
        else:
            print("Sem informações de erro claras ou erro está em sub-nós.")
            
    except Exception as e:
        print(f"Erro ao buscar execução {exec_id}:", e)
