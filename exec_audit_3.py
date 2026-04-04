import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

with open('audit_nodes.txt', 'w', encoding='utf-8') as f:
    try:
        req3 = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/executions/1216?includeData=true', headers=HEADERS)
        exec_data = json.loads(urllib.request.urlopen(req3, context=ctx).read().decode('utf-8'))
        nodes = exec_data.get('data', {}).get('resultData', {}).get('runData', {})
        for name, runs in nodes.items():
            f.write(f'--- NODE: {name} ---\n')
            for run in runs:
                if 'error' in run:
                    f.write(f'ERROR: {run["error"]}\n')
                if 'data' in run:
                    try:
                        f.write(f'DATA: {json.dumps(run["data"], indent=2, ensure_ascii=False)[:3000]}\n')
                    except Exception as ex:
                        f.write(str(ex)+"\n")
    except Exception as e:
        f.write(traceback.format_exc())
