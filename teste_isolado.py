import urllib.request, urllib.error, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
path = '/webhook/confirmacao-imediata'
payload = json.dumps({"test": True}).encode()
url = f'{N8N_URL}{path}'

print(f"Testing URL: {url}")
try:
    r = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(r, context=ctx, timeout=5)
    body = resp.read().decode()
    print(f"SUCCESS: {resp.status}")
    print(f"Body: {body}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"FAILED: {e.code}")
    print(f"Body: {body[:100]}")
except Exception as e:
    print(f"ERROR: {e}")
