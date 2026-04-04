import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

def apply_final_fix():
    try:
        # 1. Buscar o ID do workflow
        req_list = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/workflows', headers=HEADERS)
        wfs = json.loads(urllib.request.urlopen(req_list, context=ctx).read().decode('utf-8'))['data']
        target_wf = next((w for w in wfs if 'confirma' in w.get('name', '').lower()), None)
        if not target_wf:
            print("Erro: Workflow não encontrado.")
            return

        wf_id = target_wf['id']
        
        # 2. Buscar JSON
        req_get = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{wf_id}', headers=HEADERS)
        wf_data = json.loads(urllib.request.urlopen(req_get, context=ctx).read().decode('utf-8'))

        # 3. Corrigir o Nó "Buscar Agendamento" - REMOVER O SINAL DE "="
        updated = False
        for node in wf_data.get('nodes', []):
            if node['name'] == 'Buscar Agendamento':
                old_url = node['parameters'].get('url', '')
                # Procurar por id=eq.= e trocar por id=eq.
                if 'id=eq.=' in old_url:
                    new_url = old_url.replace('id=eq.=', 'id=eq.')
                    node['parameters']['url'] = new_url
                    print(f"Limpando URL do nó '{node['name']}'...")
                    print(f"DE: {old_url}")
                    print(f"PARA: {new_url}")
                    updated = True
                else:
                    print("URL já parece correta ou '=' não encontrado.")

        if not updated:
            return

        # 4. Salvar
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
        print("Sucesso! Caractere '=' removido do n8n.")

    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    apply_final_fix()
