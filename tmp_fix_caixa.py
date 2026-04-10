import urllib.request, json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'return=representation',
}

base = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co/rest/v1'

# 1. Fecha o caixa VAZIO (aberto hoje às 09:06, sem movimentações)
print("1. Fechando caixa vazio 2106487f...")
url1 = f'{base}/caixa?id=eq.2106487f-913d-42ee-8325-afe8e6820283'
payload1 = json.dumps({'status': 'fechado', 'data_fechamento': '2026-04-07T12:39:00+00:00'}).encode()
req1 = urllib.request.Request(url1, data=payload1, headers=headers, method='PATCH')
try:
    with urllib.request.urlopen(req1) as r:
        result = json.loads(r.read())
        print(f"   OK: {result}")
except urllib.error.HTTPError as e:
    print(f"   ERRO {e.code}: {e.read().decode()[:200]}")

# 2. Reabre o caixa que TEM as movimentações de hoje
print("\n2. Reabrindo caixa com movimentacoes 4a4d0f66...")
url2 = f'{base}/caixa?id=eq.4a4d0f66-2bc1-41df-a31d-863796d17878'
payload2 = json.dumps({'status': 'aberto', 'data_fechamento': None}).encode()
req2 = urllib.request.Request(url2, data=payload2, headers=headers, method='PATCH')
try:
    with urllib.request.urlopen(req2) as r:
        result = json.loads(r.read())
        print(f"   OK: {json.dumps(result, ensure_ascii=False)[:300]}")
except urllib.error.HTTPError as e:
    print(f"   ERRO {e.code}: {e.read().decode()[:200]}")

# 3. Verifica resultado final
print("\n3. Verificando status final dos caixas...")
url3 = f'{base}/caixa?select=id,status,data_abertura,valor_inicial&order=data_abertura.desc&limit=3'
req3 = urllib.request.Request(url3, headers=headers)
with urllib.request.urlopen(req3) as r:
    caixas = json.loads(r.read())
    for c in caixas:
        print(f"   {c['id'][:8]}... | {c['status']} | abertura: {str(c['data_abertura'])[:16]} | R$ {c['valor_inicial']}")
