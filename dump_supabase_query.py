import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 'Content-Type': 'application/json'}
r = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/RZLEew5BlAhhFmlg', headers=HEADERS)
nodes = json.loads(urllib.request.urlopen(r, context=ctx).read())['nodes']
with open('supabase_query.txt', 'w', encoding='utf-8') as f:
    for n in nodes:
        if ('supabase' in n['type'].lower()) or ('supabase' in n['name'].lower()):
            f.write(n['name'] + '\n')
            f.write(json.dumps(n['parameters'], indent=2))
            f.write('\n\n')
print("Salvo em supabase_query.txt")
