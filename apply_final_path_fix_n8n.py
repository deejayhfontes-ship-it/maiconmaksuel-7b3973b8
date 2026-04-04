import urllib.request, json, ssl
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

WF_ID = 'Foumgcf5oWyxGJX6'

def apply_final_path_fix():
    try:
        print(f"Buscando JSON do Workflow {WF_ID} para ajuste de paths...")
        req_get = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{WF_ID}', headers=HEADERS)
        wf_data = json.loads(urllib.request.urlopen(req_get, context=ctx).read().decode('utf-8'))
        
        changed = False
        for node in wf_data.get('nodes', []):
            params = node.get('parameters', {})
            url = params.get('url', '')
            
            # Se encontrar a referência ao node de entrada sem o body., corrigir
            if 'Receber Agendamento' in url and '.record.id' in url and '.body.record.id' not in url:
                new_url = url.replace('.record.id', '.body.record.id')
                node['parameters']['url'] = new_url
                print(f"  [PATH FIX] Corrigido no nó: {node['name']}")
                changed = True
            
            # Garantir também o nó Buscar Agendamento que pode ter sido resetado ou similar
            if node['name'] == 'Buscar Agendamento' and '{{ $json.record.id }}' in url:
                node['parameters']['url'] = url.replace('{{ $json.record.id }}', '{{ $json.body.record.id }}')
                print(f"  [PATH FIX] Corrigido no nó: {node['name']} (json context)")
                changed = True

        if changed:
            update_payload = {
                "name": wf_data["name"],
                "nodes": wf_data["nodes"],
                "connections": wf_data["connections"],
                "settings": wf_data.get("settings", {}),
                "staticData": wf_data.get("staticData", {})
            }
            req_put = urllib.request.Request(
                f'https://n8n.srv1479281.hstgr.cloud/api/v1/workflows/{WF_ID}',
                data=json.dumps(update_payload).encode('utf-8'),
                headers=HEADERS,
                method='PUT'
            )
            urllib.request.urlopen(req_put, context=ctx)
            print("Sucesso! Workflow corrigido com caminhos de corpo (body).")
        else:
            print("Nenhum path incorreto encontrado no workflow.")

    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    apply_final_path_fix()
