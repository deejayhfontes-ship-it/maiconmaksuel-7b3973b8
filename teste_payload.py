import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_WEBHOOK = 'https://n8n.srv1479281.hstgr.cloud/webhook/confirmacao-imediata'

payload = {
    "type": "INSERT",
    "table": "agendamentos",
    "schema": "public",
    "record": {"id": "foobar", "data_hora": "2026-04-04T12:00:00.000Z"},
    "old_record": None
}

data = json.dumps(payload).encode()
req = urllib.request.Request(
    N8N_WEBHOOK, data=data, method='POST',
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)
try:
    resp = urllib.request.urlopen(req, timeout=15, context=ctx)
    print(f"Status: {resp.status}")
    print(f"Body: {resp.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
