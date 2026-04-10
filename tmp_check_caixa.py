import urllib.request, json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
headers = {'apikey': key, 'Authorization': 'Bearer ' + key, 'Accept': 'application/json'}

# Pegar as movimentações de hoje com o caixa_id delas
url = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co/rest/v1/caixa_movimentacoes?select=id,caixa_id,tipo,valor,descricao,data_hora&order=data_hora.desc&limit=10'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())
    print("Movimentacoes com caixa_id:")
    caixas_ids = set()
    for m in data:
        cid = m.get('caixa_id')
        caixas_ids.add(cid)
        print(f"  caixa_id={cid} | {m.get('tipo')} | R$ {m.get('valor')} | {str(m.get('data_hora',''))[:16]}")
    
    print(f"\nCaixas IDs distintos nas movimentacoes: {caixas_ids}")
