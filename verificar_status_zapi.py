import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://api.z-api.io/instances/3EFBBECF9076D192D3C91E78C95369C2/token/4B0D7C7DF8E790BBD1B6122B/status'
headers = {
    'Client-Token': 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S',
    'Content-Type': 'application/json'
}

try:
    req = urllib.request.Request(url, headers=headers, method='GET')
    resp = urllib.request.urlopen(req, context=ctx)
    print(json.dumps(json.loads(resp.read()), indent=2))
except Exception as e:
    print(f"Erro ao verificar status da Z-API: {e}")
