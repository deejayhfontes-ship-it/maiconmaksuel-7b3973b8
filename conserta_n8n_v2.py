import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
headers = {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

wf_id = 'Foumgcf5oWyxGJX6'
req = urllib.request.Request(f'{N8N_URL}/api/v1/workflows/{wf_id}', headers=headers)
resp = urllib.request.urlopen(req, context=ctx)
wf = json.loads(resp.read().decode())

def fix_nodes(nodes):
    for n in nodes:
        if n['name'] == 'Buscar Agendamento':
            n['parameters']['url'] = n['parameters']['url'].replace('$json.record.id', '$json.body.record.id')
            
        if n['name'] == 'Checar Duplicidade':
            n['parameters']['url'] = n['parameters']['url'].replace('json.record.id', 'json.body.record.id')
            n['parameters']['options']['alwaysOutputData'] = True
            
        if n['name'] == 'Preparar':
            for ass in n['parameters']['assignments']['assignments']:
                if ass['name'] == 'ag_id':
                    ass['value'] = ass['value'].replace('json.record.id', 'json.body.record.id')
                    
        if n['name'] == 'Deve Enviar':
            for c in n['parameters']['conditions']['conditions']:
                if c['id'] == 'c1':
                    c['leftValue'] = "={{ Object.keys($json).length }}"
                    
    return nodes

out = {
    'name': wf['name'],
    'nodes': fix_nodes(wf['nodes']),
    'connections': wf['connections'],
    'settings': wf['settings']
}

dataToUpdate = json.dumps(out).encode('utf-8')
reqUpdate = urllib.request.Request(f'{N8N_URL}/api/v1/workflows/{wf_id}', data=dataToUpdate, method='PUT', headers=headers)
try:
    respUpdate = urllib.request.urlopen(reqUpdate, context=ctx)
    print("Workflow atualizado!", respUpdate.status)
except urllib.error.HTTPError as e:
    print("Erro ao atualizar", e.code, e.read().decode())
