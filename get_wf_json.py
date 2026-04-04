import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

try:
    req = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows', headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx)
    wfs = json.loads(resp.read().decode('utf-8'))['data']
    
    confirmacao_wf = None
    for w in wfs:
        if 'confirma' in w.get('name', '').lower():
            confirmacao_wf = w
            break
            
    if confirmacao_wf:
        req_wf = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{confirmacao_wf["id"]}', headers=HEADERS)
        wf_full = json.loads(urllib.request.urlopen(req_wf, context=ctx).read().decode('utf-8'))
        with open('workflow_fix_preview.json', 'w', encoding='utf-8') as f:
            json.dump(wf_full, f, indent=2, ensure_ascii=False)
            
except Exception as e:
    print(traceback.format_exc())
