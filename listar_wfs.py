import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 'Content-Type': 'application/json'}
try:
    req = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows', headers=HEADERS)
    resp = urllib.request.urlopen(req, context=ctx)
    lista = json.loads(resp.read().decode('utf-8'))['data']
    for wf in lista:
        print(f"[{wf['id']}] {wf['name']}")
        req2 = urllib.request.Request(f"https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{wf['id']}", headers=HEADERS)
        wf_data = json.loads(urllib.request.urlopen(req2, context=ctx).read().decode('utf-8'))
        for n in wf_data['nodes']:
            if 'trigger' in n['type'].lower() or 'webhook' in n['type'].lower():
                print(f"  -> {n['name']} ({n['type']})")
except Exception as e: 
    print(e)
