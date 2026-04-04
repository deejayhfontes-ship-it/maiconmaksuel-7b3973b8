import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co/rest/v1/configuracoes_whatsapp?select=*'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
try:
    req = urllib.request.Request(URL, headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY})
    resp = urllib.request.urlopen(req, context=ctx)
    d = json.loads(resp.read())[0]
    print(f"Instance_id: {d.get('instance_id')}")
    print(f"API Token: {d.get('api_token')}")
    print(f"Client Token: {d.get('client_token')}")
    print(f"Ativa: {d.get('sessao_ativa')}")
except Exception as e:
    print(e)
