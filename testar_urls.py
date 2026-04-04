import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    'https://n8n.srv1479281.hstgr.cloud/webhook/confirmacao-imediata',
    'https://n8n.srv1479281.hstgr.cloud/webhook/ci-webhook',
    'https://n8n.srv1479281.hstgr.cloud/webhook-test/confirmacao-imediata',
]

payload = json.dumps({"test": True, "record": {"id": "test"}}).encode()

for url in urls:
    try:
        req = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type': 'application/json'})
        resp = urllib.request.urlopen(req, context=ctx, timeout=10)
        print(f"✅ {url} -> {resp.status}")
    except Exception as e:
        print(f"❌ {url} -> {e}")
