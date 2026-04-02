"""Inspeciona o conteúdo dos workflows n8n para diagnosticar o problema."""
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

# Listar workflows
lista = get('/api/v1/workflows')
workflows = lista.get('data', [])

for wf_resumo in workflows:
    wf_id = wf_resumo['id']
    wf = get(f'/api/v1/workflows/{wf_id}')
    wf_str = json.dumps(wf)
    
    print(f"\n{'='*60}")
    print(f"WORKFLOW: {wf['name']}")
    print(f"ID: {wf_id} | Ativo: {wf_resumo.get('active')}")
    print(f"{'='*60}")
    
    # Extrair todas as URLs e valores relevantes dos nodes
    for node in wf.get('nodes', []):
        nome = node.get('name', '')
        tipo = node.get('type', '')
        params = node.get('parameters', {})
        params_str = json.dumps(params)
        
        # Mostrar nodes com URLs HTTP
        if 'supabase' in params_str.lower() or 'z-api' in params_str.lower() or 'hstgr' in params_str.lower():
            print(f"\n  [NODE] {nome} ({tipo})")
            
            # Mostrar URL se existir
            if 'url' in params:
                print(f"    URL: {params['url']}")
            
            # Mostrar headers
            if 'headerParameters' in params:
                for hp in params['headerParameters'].get('parameters', []):
                    val = hp.get('value', '')
                    if len(val) > 40:
                        val = val[:40] + '...'
                    print(f"    Header {hp.get('name')}: {val}")
            
            # Mostrar query params
            if 'queryParameters' in params:
                for qp in params['queryParameters'].get('parameters', []):
                    print(f"    Query {qp.get('name')}: {qp.get('value', '')[:60]}")
        
        # Mostrar triggers de schedule
        if 'schedule' in tipo.lower() or 'trigger' in tipo.lower():
            print(f"\n  [TRIGGER] {nome}")
            if 'rule' in params:
                print(f"    Regra: {json.dumps(params['rule'])}")
            if 'cronExpression' in params:
                print(f"    Cron: {params['cronExpression']}")
