import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

def apply_fix():
    try:
        # 1. Buscar todos os workflows para achar o ID correto
        req_list = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows', headers=HEADERS)
        wfs = json.loads(urllib.request.urlopen(req_list, context=ctx).read().decode('utf-8'))['data']
        
        target_wf = next((w for w in wfs if 'confirma' in w.get('name', '').lower()), None)
        if not target_wf:
            print("Erro: Workflow de confirmação não encontrado.")
            return

        wf_id = target_wf['id']
        print(f"Workflow encontrado: {target_wf['name']} (ID: {wf_id})")

        # 2. Buscar o JSON completo do workflow
        req_get = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{wf_id}', headers=HEADERS)
        wf_data = json.loads(urllib.request.urlopen(req_get, context=ctx).read().decode('utf-8'))

        # 3. Localizar e alterar o nó "Buscar Agendamento"
        updated = False
        for node in wf_data.get('nodes', []):
            if node['name'] == 'Buscar Agendamento':
                old_url = node['parameters'].get('url', '')
                if '{{ $json.record.id }}' in old_url:
                    new_url = old_url.replace('{{ $json.record.id }}', '{{ $json.body.record.id }}')
                    node['parameters']['url'] = new_url
                    print(f"Alterando URL do nó '{node['name']}'...")
                    print(f"DE: {old_url}")
                    print(f"PARA: {new_url}")
                    updated = True
                else:
                    print(f"Aviso: O nó '{node['name']}' já parece estar com o formato diferente ou já foi corrigido.")

        if not updated:
            print("Nenhuma alteração necessária ou nó não encontrado.")
            return

        # 4. Enviar o update de volta para o n8n
        # A API de n8n costuma aceitar um PUT no endpoint do workflow.
        # Importante: Precisamos enviar apenas os campos necessários (nodes, connections, name, staticData, settings etc)
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
        
        with urllib.request.urlopen(req_put, context=ctx) as response:
            if response.status == 200:
                print("Sucesso! Workflow atualizado e salvo no n8n.")
            else:
                print(f"Erro ao atualizar: Status {response.status}")

    except Exception as e:
        print("Erro crítico na aplicação do fix:")
        traceback.print_exc()

if __name__ == "__main__":
    apply_fix()
