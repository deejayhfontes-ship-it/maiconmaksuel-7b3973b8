import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://api.z-api.io/instances/3EFBBECF9076D192D3C91E78C95369C2/token/4B0D7C7DF8E790BBD1B6122B/send-text'
headers = {
    'Client-Token': 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S',
    'Content-Type': 'application/json'
}

data = {
    "phone": "5535997438102",
    "message": "Teste automatizado do chatbot / comunicacao para verificar se a Z-API esta enviando mensagens."
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='POST')
try:
    resp = urllib.request.urlopen(req, context=ctx)
    print(json.dumps(json.loads(resp.read()), indent=2))
except Exception as e:
    print(f"Erro: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
