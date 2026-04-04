import urllib.request
import json
import ssl
import sys

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

try:
    exec_data = get(f'/api/v1/executions/963')
    with open('exec_963.json', 'w', encoding='utf-8') as f:
        json.dump(exec_data, f, indent=2)
    print("Salvo em exec_963.json")
except Exception as e:
    print(e)
