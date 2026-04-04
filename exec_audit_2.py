import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

with open('audit_log.txt', 'w', encoding='utf-8') as f:
    def printf(msg=""):
        f.write(str(msg) + "\n")

    try:
        req = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows', headers=HEADERS)
        resp = urllib.request.urlopen(req, context=ctx)
        wfs = json.loads(resp.read().decode('utf-8'))['data']
        
        confirmacao_wf = None
        for w in wfs:
            if 'confirma' in w.get('name', '').lower():
                confirmacao_wf = w
                break
                
        if not confirmacao_wf:
            printf("Workflow de confirmacao nao encontrado!")
            exit()
            
        printf(f"WF Achado: {confirmacao_wf['name']} ID: {confirmacao_wf['id']}")
        
        wid = confirmacao_wf['id']
        req2 = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/executions?workflowId={wid}&limit=5', headers=HEADERS)
        execs = json.loads(urllib.request.urlopen(req2, context=ctx).read().decode('utf-8'))['data']
        
        printf("\n--- ULTIMAS 5 EXECUCOES ---")
        for idx, e in enumerate(execs):
            printf(f"{idx+1}. ID: {e['id']} | Status: {e['status']} | Inicio: {e['startedAt']}")
        
        if len(execs) > 0:
            latest = execs[0]['id']
            printf(f"\n--- BUSCANDO DETALHES DO Z-API NA EXECUCAO {latest} ---")
            req3 = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/executions/{latest}?includeData=true', headers=HEADERS)
            exec_data = json.loads(urllib.request.urlopen(req3, context=ctx).read().decode('utf-8'))
            nodes = exec_data.get('data', {}).get('resultData', {}).get('runData', {})
            
            for node_name, runs in nodes.items():
                if 'z-api' in node_name.lower() or 'http' in node_name.lower() or 'request' in node_name.lower():
                    printf(f"\nNode: {node_name}")
                    for idx, run in enumerate(runs):
                        if 'error' in run:
                            printf(f"  erro: {run['error']}")
                        if 'data' in run:
                            # Extract the HTTP request data if available
                            main_data = run['data'].get('main', [])
                            printf(f"  > Output Principal [{idx}]:")
                            for item in main_data:
                                for sub_item in item:
                                    if 'json' in sub_item:
                                        json_str = json.dumps(sub_item['json'], indent=2, ensure_ascii=False)
                                        printf(f"      {json_str}")
    except Exception as e:
        printf(traceback.format_exc())
