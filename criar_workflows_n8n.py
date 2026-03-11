import urllib.request
import json

N8N = 'https://n8n.srv1479281.hstgr.cloud'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'

SUPABASE_URL = 'https://lzdyzjhqfudsofpcojyi.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZHl6amhxZnVkc29mcGNvanlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMzEzMTUsImV4cCI6MjA1MDgwNzMxNX0.PmhT_WaQ3uJzWbqVvHs1n0eCHOkFqLSHRGrHknUVXBc'
ZAPI_INSTANCE = '3EFBBECF9076D192D3C91E78C95369C2'
ZAPI_TOKEN = '4B0D7C7DF8E790BBD1B6122B'
ZAPI_CLIENT = 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S'
ZAPI_BASE = f'https://api.z-api.io/instances/{ZAPI_INSTANCE}/token/{ZAPI_TOKEN}'

HEADERS = {'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json'}

CODE_AVALIACAO = """const items = [];
for (const item of $input.all()) {
  const ag = item.json;
  const nome = (ag.clientes && ag.clientes.nome) ? ag.clientes.nome : 'Cliente';
  const celular = (ag.clientes && ag.clientes.celular) ? ag.clientes.celular : null;
  if (!celular) continue;
  let phone = celular.replace(/\\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;
  const mensagem = `Oi ${nome}! 😊 Obrigado pela visita ao salão Maicon Maksuel!\\n\\nComo foi sua experiência conosco? Avalie de 1 a 5:\\n\\n1 - Ruim\\n2 - Regular\\n3 - Bom\\n4 - Ótimo\\n5 - Excelente\\n\\nResponda com o número da avaliação. Sua opinião é muito importante para nós! 💜`;
  items.push({ json: { phone, mensagem } });
}
return items;"""


def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(N8N + path, data=data, method=method, headers=HEADERS)
    r = urllib.request.urlopen(req, timeout=15)
    return json.loads(r.read())


# ── 1. CRIAR WORKFLOW DE AVALIAÇÃO ──────────────────────────────────
workflow_avaliacao = {
    'name': 'Avaliacao Pos-Atendimento - Maicon Maksuel',
    'nodes': [
        {
            'id': 'av-node-1',
            'name': 'Agendador 10h Diario',
            'type': 'n8n-nodes-base.scheduleTrigger',
            'typeVersion': 1.2,
            'position': [240, 300],
            'parameters': {
                'rule': {
                    'interval': [{'field': 'hours', 'triggerAtHour': 10}]
                }
            }
        },
        {
            'id': 'av-node-2',
            'name': 'Buscar Agendamentos Ontem',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [460, 300],
            'parameters': {
                'method': 'GET',
                'url': SUPABASE_URL + '/rest/v1/agendamentos',
                'sendQuery': True,
                'queryParameters': {
                    'parameters': [
                        {'name': 'select', 'value': 'id,data,hora,status,clientes(nome,celular)'},
                        {'name': 'data', 'value': "={{ $today.minus({days:1}).toFormat('yyyy-MM-dd') }}"},
                        {'name': 'status', 'value': 'eq.confirmado'}
                    ]
                },
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'apikey', 'value': SUPABASE_KEY},
                        {'name': 'Authorization', 'value': 'Bearer ' + SUPABASE_KEY}
                    ]
                }
            }
        },
        {
            'id': 'av-node-3',
            'name': 'Formatar Mensagem Avaliacao',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [680, 300],
            'parameters': {
                'language': 'javaScript',
                'jsCode': CODE_AVALIACAO
            }
        },
        {
            'id': 'av-node-4',
            'name': 'Enviar WhatsApp Avaliacao',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [900, 300],
            'parameters': {
                'method': 'POST',
                'url': ZAPI_BASE + '/send-text',
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'Client-Token', 'value': ZAPI_CLIENT},
                        {'name': 'Content-Type', 'value': 'application/json'}
                    ]
                },
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': '{"phone": "={{ $json.phone }}", "message": "={{ $json.mensagem }}"}'
            }
        }
    ],
    'connections': {
        'Agendador 10h Diario': {
            'main': [[{'node': 'Buscar Agendamentos Ontem', 'type': 'main', 'index': 0}]]
        },
        'Buscar Agendamentos Ontem': {
            'main': [[{'node': 'Formatar Mensagem Avaliacao', 'type': 'main', 'index': 0}]]
        },
        'Formatar Mensagem Avaliacao': {
            'main': [[{'node': 'Enviar WhatsApp Avaliacao', 'type': 'main', 'index': 0}]]
        }
    },
    'settings': {'executionOrder': 'v1'}
}

print("Criando workflow de avaliação...")
resp = api('POST', '/api/v1/workflows', workflow_avaliacao)
av_id = resp.get('id')
print(f"  OK - ID: {av_id} | Nome: {resp.get('name')}")

# Ativar
print("Ativando workflow de avaliação...")
api('PATCH', f'/api/v1/workflows/{av_id}/activate')
print("  OK - Ativado!")

# ── 2. ATIVAR O CHATBOT JÁ EXISTENTE ──────────────────────────────────
CHATBOT_ID = 'tcb575OhvvXqagsQ'
print(f"\nAtivando chatbot (ID: {CHATBOT_ID})...")
api('PATCH', f'/api/v1/workflows/{CHATBOT_ID}/activate')
print("  OK - Chatbot ativado!")

print("\n✅ Todos os workflows configurados com sucesso!")
