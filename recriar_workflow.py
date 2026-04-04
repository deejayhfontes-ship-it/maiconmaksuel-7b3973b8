"""
Deleta o workflow antigo e recria do zero sem IDs manuais.
O n8n vai gerar o webhookId automaticamente.
"""
import urllib.request, urllib.error, json, ssl, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'
SUPABASE_URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'
ZAPI_INSTANCE = '3EFBBECF9076D192D3C91E78C95369C2'
ZAPI_TOKEN = '4B0D7C7DF8E790BBD1B6122B'
ZAPI_CLIENT_TOKEN = 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S'

HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}
OLD_WF_ID = 'EbtCBhQ9HRZ1XOCM'

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(N8N_URL + path, data=data, method=method, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(r, timeout=30, context=ctx)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:300]
        print(f"  HTTP {e.code}: {msg}")
        return None

# 1. Deletar workflow antigo
print("1. Deletando workflow antigo...")
req('DELETE', f'/api/v1/workflows/{OLD_WF_ID}')
print("   OK")

# 2. Criar novo workflow SEM nenhum id nos nodes
print("2. Criando workflow novo (sem IDs manuais)...")

workflow = {
  "name": "Confirmacao Imediata - Maicon Maksuel",
  "nodes": [
    {
      "name": "Receber Agendamento",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "confirmacao-imediata",
        "responseMode": "onReceived",
        "options": {}
      }
    },
    {
      "name": "Buscar Agendamento",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [520, 300],
      "parameters": {
        "method": "GET",
        "url": f"={SUPABASE_URL}/rest/v1/agendamentos?id=eq.={{{{ $json.record.id }}}}&select=id,data_hora,cliente_id,profissional_id,servico_id,clientes(nome,celular),profissionais(nome),servicos(nome)",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"}
          ]
        },
        "options": {}
      }
    },
    {
      "name": "Checar Duplicidade",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [800, 300],
      "parameters": {
        "method": "GET",
        "url": f"={SUPABASE_URL}/rest/v1/whatsapp_logs?agendamento_id=eq.={{{{ $('Receber Agendamento').item.json.record.id }}}}&tipo_mensagem=eq.confirmacao&status_envio=eq.enviado&enviado_por_manual=eq.false&select=id",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"}
          ]
        },
        "options": {}
      }
    },
    {
      "name": "Deve Enviar",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [1080, 300],
      "parameters": {
        "conditions": {
          "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
          "conditions": [
            {"id":"c1","leftValue":"={{ $json.length }}","rightValue":0,"operator":{"type":"number","operation":"equals"}},
            {"id":"c2","leftValue":"={{ $('Buscar Agendamento').item.json[0]?.clientes?.celular || '' }}","rightValue":"","operator":{"type":"string","operation":"notEquals"}}
          ],
          "combinator": "and"
        }
      }
    },
    {
      "name": "Preparar",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [1360, 180],
      "parameters": {
        "mode": "manual",
        "duplicateItem": False,
        "assignments": {
          "assignments": [
            {"id":"s1","name":"ag_id","value":"={{ $('Receber Agendamento').item.json.record.id }}","type":"string"},
            {"id":"s2","name":"cli_id","value":"={{ $('Buscar Agendamento').item.json[0].cliente_id }}","type":"string"},
            {"id":"s3","name":"nome","value":"={{ $('Buscar Agendamento').item.json[0].clientes.nome }}","type":"string"},
            {"id":"s4","name":"cel_raw","value":"={{ $('Buscar Agendamento').item.json[0].clientes.celular }}","type":"string"},
            {"id":"s5","name":"tel","value":"={{ (() => { const t = ($('Buscar Agendamento').item.json[0].clientes.celular || '').replace(/\\\\D/g,''); return t.startsWith('55') ? t : '55'+t; })() }}","type":"string"},
            {"id":"s6","name":"srv","value":"={{ $('Buscar Agendamento').item.json[0].servicos?.nome || 'Servico' }}","type":"string"},
            {"id":"s7","name":"prof","value":"={{ $('Buscar Agendamento').item.json[0].profissionais?.nome || '' }}","type":"string"},
            {"id":"s8","name":"dthr","value":"={{ new Date($('Buscar Agendamento').item.json[0].data_hora).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) }}","type":"string"}
          ]
        },
        "options": {}
      }
    },
    {
      "name": "Criar Log",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1640, 180],
      "parameters": {
        "method": "POST",
        "url": f"{SUPABASE_URL}/rest/v1/whatsapp_logs",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": f"Bearer {SUPABASE_KEY}"},
            {"name": "Content-Type", "value": "application/json"},
            {"name": "Prefer", "value": "return=representation"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({agendamento_id:$json.ag_id,cliente_id:$json.cli_id,telefone:$json.cel_raw,tipo_mensagem:'confirmacao',status_envio:'processando',origem_fluxo:'n8n',provider:'z-api',mensagem_texto:'Confirmacao para '+$json.nome}) }}",
        "options": {}
      }
    },
    {
      "name": "Enviar Z-API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1920, 180],
      "parameters": {
        "method": "POST",
        "url": f"https://api.z-api.io/instances/{ZAPI_INSTANCE}/token/{ZAPI_TOKEN}/send-text",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "Client-Token", "value": ZAPI_CLIENT_TOKEN},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({phone:$('Preparar').item.json.tel,message:'Ola '+$('Preparar').item.json.nome+'! Seu agendamento esta confirmado para '+$('Preparar').item.json.dthr+'. Servico: '+$('Preparar').item.json.srv+'. Com: '+$('Preparar').item.json.prof+'. Responda SIM para confirmar. Maicon Maksuel Concept.'}) }}",
        "options": {}
      }
    },
    {
      "name": "Log OK",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2200, 100],
      "parameters": {
        "method": "PATCH",
        "url": f"={SUPABASE_URL}/rest/v1/whatsapp_logs?id=eq.={{{{ $('Criar Log').item.json[0].id }}}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name":"apikey","value":SUPABASE_KEY},
            {"name":"Authorization","value":f"Bearer {SUPABASE_KEY}"},
            {"name":"Content-Type","value":"application/json"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({status_envio:'enviado',provider_message_id:$json.messageId||$json.zaapId||'',payload_retorno:$json,enviado_em:new Date().toISOString()}) }}",
        "options": {}
      }
    },
    {
      "name": "Log Falha",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2200, 300],
      "parameters": {
        "method": "PATCH",
        "url": f"={SUPABASE_URL}/rest/v1/whatsapp_logs?id=eq.={{{{ $('Criar Log').item.json[0].id }}}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name":"apikey","value":SUPABASE_KEY},
            {"name":"Authorization","value":f"Bearer {SUPABASE_KEY}"},
            {"name":"Content-Type","value":"application/json"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({status_envio:'falha',erro_detalhado:JSON.stringify($json),payload_retorno:$json,enviado_em:new Date().toISOString()}) }}",
        "options": {}
      }
    }
  ],
  "connections": {
    "Receber Agendamento": {"main":[[{"node":"Buscar Agendamento","type":"main","index":0}]]},
    "Buscar Agendamento":  {"main":[[{"node":"Checar Duplicidade","type":"main","index":0}]]},
    "Checar Duplicidade":  {"main":[[{"node":"Deve Enviar","type":"main","index":0}]]},
    "Deve Enviar":         {"main":[[{"node":"Preparar","type":"main","index":0}],[]]},
    "Preparar":            {"main":[[{"node":"Criar Log","type":"main","index":0}]]},
    "Criar Log":           {"main":[[{"node":"Enviar Z-API","type":"main","index":0}]]},
    "Enviar Z-API":        {"main":[[{"node":"Log OK","type":"main","index":0}],[{"node":"Log Falha","type":"main","index":0}]]}
  },
  "settings": {"executionOrder": "v1"}
}

result = req('POST', '/api/v1/workflows', workflow)
if not result:
    print("FALHA ao criar!")
    exit(1)

new_id = result['id']
print(f"   ✅ Novo workflow: {new_id}")

# 3. Ativar
print("3. Ativando...")
req('POST', f'/api/v1/workflows/{new_id}/activate')
print("   ✅ ATIVO!")

# 4. Buscar webhook URL gerada
print("4. Buscando URL do webhook...")
wf = req('GET', f'/api/v1/workflows/{new_id}')
webhook_url = None
for node in wf['nodes']:
    if 'webhook' in node['type'].lower():
        wh_id = node.get('webhookId', '')
        path = node.get('parameters', {}).get('path', '')
        print(f"   webhookId: {wh_id}")
        print(f"   path: {path}")
        webhook_url = f"{N8N_URL}/webhook/{wh_id}" if wh_id else f"{N8N_URL}/webhook/{path}"

# 5. Testar o webhook
time.sleep(2)
print(f"\n5. Testando webhook: {webhook_url}")
payload = json.dumps({"type":"INSERT","table":"agendamentos","record":{"id":"teste-dummy"}}).encode()
try:
    r = urllib.request.Request(webhook_url, data=payload, method='POST', headers={'Content-Type':'application/json'})
    resp = urllib.request.urlopen(r, context=ctx, timeout=10)
    print(f"   ✅ STATUS {resp.status} — WEBHOOK FUNCIONANDO!")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:200]
    print(f"   ❌ HTTP {e.code}: {body}")
    # Tentar pelo path tambem
    alt_url = f"{N8N_URL}/webhook/{path}"
    if alt_url != webhook_url:
        print(f"   Tentando alternativa: {alt_url}")
        try:
            r2 = urllib.request.Request(alt_url, data=payload, method='POST', headers={'Content-Type':'application/json'})
            resp2 = urllib.request.urlopen(r2, context=ctx, timeout=10)
            print(f"   ✅ STATUS {resp2.status} — WEBHOOK FUNCIONANDO (via path)!")
            webhook_url = alt_url
        except Exception as e2:
            print(f"   ❌ Alternativa tambem falhou: {e2}")

print(f"\n{'='*60}")
print(f"WEBHOOK URL FINAL: {webhook_url}")
print(f"{'='*60}")
