"""
Cria o workflow "Confirmacao Imediata de Agendamento" no n8n.
Versao simplificada com payload correto para n8n v1 API.
"""
import urllib.request
import urllib.error
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = 'https://n8n.srv1479281.hstgr.cloud'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8'

SUPABASE_URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'

ZAPI_INSTANCE  = '3EFBBECF9076D192D3C91E78C95369C2'
ZAPI_TOKEN     = '4B0D7C7DF8E790BBD1B6122B'
ZAPI_CLIENT_TOKEN = 'Fbab85f2da2684d40ac0ff07d9ddcf0e8S'

HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}

# Workflow minimo valido para n8n v1 API
workflow = {
  "name": "Confirmacao Imediata - Maicon Maksuel",
  "nodes": [
    {
      "id": "ci-webhook",
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
      "id": "ci-get-ag",
      "name": "Buscar Agendamento Completo",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [520, 300],
      "parameters": {
        "method": "GET",
        "url": "=" + SUPABASE_URL + "/rest/v1/agendamentos?id=eq.={{ $json.record.id }}&select=id,data_hora,cliente_id,profissional_id,servico_id,clientes(nome,celular),profissionais(nome),servicos(nome)",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": "Bearer " + SUPABASE_KEY}
          ]
        },
        "options": {}
      }
    },
    {
      "id": "ci-check-dup",
      "name": "Checar Duplicidade",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [800, 300],
      "parameters": {
        "method": "GET",
        "url": "=" + SUPABASE_URL + "/rest/v1/whatsapp_logs?agendamento_id=eq.={{ $('Receber Agendamento').item.json.record.id }}&tipo_mensagem=eq.confirmacao&status_envio=eq.enviado&enviado_por_manual=eq.false&select=id",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": "Bearer " + SUPABASE_KEY}
          ]
        },
        "options": {}
      }
    },
    {
      "id": "ci-if",
      "name": "Deve Enviar Agora?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [1080, 300],
      "parameters": {
        "conditions": {
          "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
          "conditions": [
            {
              "id": "no-dup",
              "leftValue": "={{ $json.length }}",
              "rightValue": 0,
              "operator": {"type": "number", "operation": "equals"}
            },
            {
              "id": "has-phone",
              "leftValue": "={{ $('Buscar Agendamento Completo').item.json[0]?.clientes?.celular || '' }}",
              "rightValue": "",
              "operator": {"type": "string", "operation": "notEquals"}
            }
          ],
          "combinator": "and"
        }
      }
    },
    {
      "id": "ci-prep",
      "name": "Preparar Dados",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [1360, 180],
      "parameters": {
        "mode": "manual",
        "duplicateItem": False,
        "assignments": {
          "assignments": [
            {"id": "a1", "name": "agendamento_id", "value": "={{ $('Receber Agendamento').item.json.record.id }}", "type": "string"},
            {"id": "a2", "name": "cliente_id", "value": "={{ $('Buscar Agendamento Completo').item.json[0].cliente_id }}", "type": "string"},
            {"id": "a3", "name": "nome_cliente", "value": "={{ $('Buscar Agendamento Completo').item.json[0].clientes.nome }}", "type": "string"},
            {"id": "a4", "name": "celular_raw", "value": "={{ $('Buscar Agendamento Completo').item.json[0].clientes.celular }}", "type": "string"},
            {"id": "a5", "name": "telefone", "value": "={{ (() => { const t = ($('Buscar Agendamento Completo').item.json[0].clientes.celular || '').replace(/\\D/g,''); return t.startsWith('55') ? t : '55' + t; })() }}", "type": "string"},
            {"id": "a6", "name": "nome_servico", "value": "={{ $('Buscar Agendamento Completo').item.json[0].servicos?.nome || 'Servico' }}", "type": "string"},
            {"id": "a7", "name": "nome_profissional", "value": "={{ $('Buscar Agendamento Completo').item.json[0].profissionais?.nome || 'Profissional' }}", "type": "string"},
            {
              "id": "a8",
              "name": "data_hora_br",
              "value": "={{ new Date($('Buscar Agendamento Completo').item.json[0].data_hora).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo', weekday:'long', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) }}",
              "type": "string"
            }
          ]
        },
        "options": {}
      }
    },
    {
      "id": "ci-log-start",
      "name": "Criar Log Inicial",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1640, 180],
      "parameters": {
        "method": "POST",
        "url": SUPABASE_URL + "/rest/v1/whatsapp_logs",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": "Bearer " + SUPABASE_KEY},
            {"name": "Content-Type", "value": "application/json"},
            {"name": "Prefer", "value": "return=representation"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({ agendamento_id: $json.agendamento_id, cliente_id: $json.cliente_id, telefone: $json.celular_raw, tipo_mensagem: 'confirmacao', status_envio: 'processando', origem_fluxo: 'n8n', provider: 'z-api', mensagem_texto: 'Ola, ' + $json.nome_cliente + '! Seu agendamento esta confirmado para ' + $json.data_hora_br + '. Servico: ' + $json.nome_servico + ' com ' + $json.nome_profissional + '. Responda SIM para confirmar ou NAO para cancelar. Maicon Maksuel Concept.' }) }}",
        "options": {}
      }
    },
    {
      "id": "ci-send",
      "name": "Enviar via Z-API",
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
        "body": "={{ JSON.stringify({ phone: $('Preparar Dados').item.json.telefone, message: 'Ola, ' + $('Preparar Dados').item.json.nome_cliente + '!\\n\\n Seu agendamento esta confirmado!\\n\\n' + $('Preparar Dados').item.json.data_hora_br + '\\n Servico: ' + $('Preparar Dados').item.json.nome_servico + '\\n Profissional: ' + $('Preparar Dados').item.json.nome_profissional + '\\n\\nResponda SIM para confirmar ou NAO para cancelar.\\n\\nMaicon Maksuel Concept.' }) }}",
        "options": {}
      }
    },
    {
      "id": "ci-log-ok",
      "name": "Log Envio OK",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2200, 100],
      "parameters": {
        "method": "PATCH",
        "url": "=" + SUPABASE_URL + "/rest/v1/whatsapp_logs?id=eq.={{ $('Criar Log Inicial').item.json[0].id }}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": "Bearer " + SUPABASE_KEY},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({ status_envio: 'enviado', provider_message_id: $json.messageId || $json.zaapId || '', payload_retorno: $json, enviado_em: new Date().toISOString() }) }}",
        "options": {}
      }
    },
    {
      "id": "ci-log-err",
      "name": "Log Envio Falhou",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2200, 300],
      "parameters": {
        "method": "PATCH",
        "url": "=" + SUPABASE_URL + "/rest/v1/whatsapp_logs?id=eq.={{ $('Criar Log Inicial').item.json[0].id }}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            {"name": "apikey", "value": SUPABASE_KEY},
            {"name": "Authorization", "value": "Bearer " + SUPABASE_KEY},
            {"name": "Content-Type", "value": "application/json"}
          ]
        },
        "sendBody": True,
        "contentType": "json",
        "body": "={{ JSON.stringify({ status_envio: 'falha', erro_detalhado: JSON.stringify($json), payload_retorno: $json, enviado_em: new Date().toISOString() }) }}",
        "options": {}
      }
    }
  ],
  "connections": {
    "Receber Agendamento":          {"main": [[{"node": "Buscar Agendamento Completo", "type": "main", "index": 0}]]},
    "Buscar Agendamento Completo":  {"main": [[{"node": "Checar Duplicidade",         "type": "main", "index": 0}]]},
    "Checar Duplicidade":           {"main": [[{"node": "Deve Enviar Agora?",          "type": "main", "index": 0}]]},
    "Deve Enviar Agora?":           {"main": [
                                       [{"node": "Preparar Dados", "type": "main", "index": 0}],
                                       []
                                    ]},
    "Preparar Dados":               {"main": [[{"node": "Criar Log Inicial",           "type": "main", "index": 0}]]},
    "Criar Log Inicial":            {"main": [[{"node": "Enviar via Z-API",            "type": "main", "index": 0}]]},
    "Enviar via Z-API":             {"main": [
                                       [{"node": "Log Envio OK",     "type": "main", "index": 0}],
                                       [{"node": "Log Envio Falhou", "type": "main", "index": 0}]
                                    ]}
  },
  "settings": {"executionOrder": "v1"}
}

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(N8N_URL + path, data=data, method=method, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(r, timeout=30, context=ctx)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"HTTP {e.code}: {msg[:600]}")
        raise

print("=" * 60)
print("Criando workflow no n8n...")
result = req('POST', '/api/v1/workflows', workflow)
wf_id = result.get('id')
print(f"Workflow criado! ID: {wf_id}")

# Ativar o workflow
print("Ativando workflow...")
req('POST', f'/api/v1/workflows/{wf_id}/activate')
print("Workflow ATIVO!")

print()
print("=" * 60)
print("PROXIMO PASSO: Configure o Database Webhook no Supabase")
print("=" * 60)
print(f"""
URL: https://supabase.com/dashboard/project/hhzvjsrsoyhjzeiuxpep/database/hooks

Crie um novo hook:
  Nome:    Confirmacao Agendamento
  Tabela:  agendamentos
  Evento:  INSERT
  Tipo:    HTTP Request
  URL:     {N8N_URL}/webhook/confirmacao-imediata
  Metodo:  POST
""")
