import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

WFS_TO_FIX = [
    'Foumgcf5oWyxGJX6', # Confirmacao Imediata
    'RZLEew5BlAhhFmlg', # Lembretes Automaticos
    'lFY3NsyE1dWzmvq6'  # Avaliacao Pos-Atendimento
]

def apply_systemic_fix():
    for wf_id in WFS_TO_FIX:
        try:
            print(f"\nAuditando Workflow: {wf_id}")
            # 1. Get current state
            req_get = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{wf_id}', headers=HEADERS)
            wf_data = json.loads(urllib.request.urlopen(req_get, context=ctx).read().decode('utf-8'))
            
            changed = False
            
            # 2. Fix Nodes
            for node in wf_data.get('nodes', []):
                params = node.get('parameters', {})
                url = params.get('url', '')
                
                # Fix syntax eq.=
                if 'eq.=' in url:
                    new_url = url.replace('eq.=', 'eq.')
                    node['parameters']['url'] = new_url
                    print(f"  [FIX] Sintaxe eq. corrigida no nó: {node['name']}")
                    changed = True
                
                # Fix specific path for Confirmacao Imediata
                if wf_id == 'Foumgcf5oWyxGJX6':
                    if node['name'] == 'Checar Duplicidade':
                        # Se estiver usando record.id sem o body., corrigir
                        if '{{ $json.record.id }}' in url:
                             node['parameters']['url'] = url.replace('{{ $json.record.id }}', '{{ $json.body.record.id }}')
                             print(f"  [FIX] Path corrigido para body no nó: {node['name']}")
                             changed = True
            
            # 3. Save if changed
            if changed:
                update_payload = {
                    "name": wf_data["name"],
                    "nodes": wf_data["nodes"],
                    "connections": wf_data["connections"],
                    "settings": wf_data.get("settings", {}),
                    "staticData": wf_data.get("staticData", {})
                }
                req_put = urllib.request.Request(
                    f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{wf_id}',
                    data=json.dumps(update_payload).encode('utf-8'),
                    headers=HEADERS,
                    method='PUT'
                )
                urllib.request.urlopen(req_put, context=ctx)
                print(f"  [OK] Workflow {wf_id} atualizado com sucesso!")
            else:
                print(f"  [SKY] Nenhuma alteração necessária para {wf_id}")

        except Exception as e:
            print(f"  [ERRO] Falha ao processar {wf_id}: {e}")

if __name__ == "__main__":
    apply_systemic_fix()
