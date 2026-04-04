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
    # Get latest execution
    req_execs = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/executions?limit=1', headers=HEADERS)
    eid = json.loads(urllib.request.urlopen(req_execs, context=ctx).read().decode('utf-8'))['data'][0]['id']
    
    # Get details
    req3 = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/executions/{eid}?includeData=true', headers=HEADERS)
    exec_data = json.loads(urllib.request.urlopen(req3, context=ctx).read().decode('utf-8'))
    
    with open('last_execution_debug.json', 'w', encoding='utf-8') as f:
        json.dump(exec_data, f, indent=2, ensure_ascii=False)
    
    run_data = exec_data.get('data', {}).get('resultData', {}).get('runData', {})
    
    print(f"Execução: {eid}")
    for name, runs in run_data.items():
        print(f"Node: {name}")
        if 'error' in runs[0]:
            print(f"  ERROR: {runs[0]['error']}")
        if 'data' in runs[0]:
            print(f"  DATA (keys): {list(runs[0]['data'].keys())}")
            if 'main' in runs[0]['data'] and len(runs[0]['data']['main']) > 0:
                print(f"  MAIN[0][0][json]: {list(runs[0]['data']['main'][0][0].get('json', {}).keys())}")
                if 'body' in runs[0]['data']['main'][0][0]['json']:
                    print(f"  BODY Content: {runs[0]['data']['main'][0][0]['json']['body']}")

except Exception as e:
    traceback.print_exc()
