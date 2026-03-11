import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

ZAPI_INSTANCE = '3EFBBECF9076D192D3C91E78C95369C2'
ZAPI_TOKEN = '4B0D7C7DF8E790BBD1B6122B'
ZAPI_CLIENT = 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S'
url = f'https://api.z-api.io/instances/{ZAPI_INSTANCE}/token/{ZAPI_TOKEN}/send-text'

phone = '5535991116310'
mensagem = (
    "Ola! 😊\n\n"
    "Este e um teste do sistema de lembretes do salao Maicon Maksuel.\n\n"
    "Voce tem um agendamento amanha - 11/03/2026 as 14h00.\n\n"
    "Por favor, confirme sua presenca:\n\n"
    "SIM - Confirmar\n"
    "NAO - Cancelar\n\n"
    "Aguardamos voce! 💜"
)

body = json.dumps({'phone': phone, 'message': mensagem}).encode()
req = urllib.request.Request(url, data=body, method='POST',
    headers={'Client-Token': ZAPI_CLIENT, 'Content-Type': 'application/json'})
r = urllib.request.urlopen(req, timeout=10, context=ctx)
resp = json.loads(r.read())
print('Resposta Z-API:', json.dumps(resp))
