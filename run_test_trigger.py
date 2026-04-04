import urllib.request, json, ssl
import time
import traceback

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_HEADERS = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjIzNGQ4YS00ZjEyLTQ3ZDUtYjRlZS1jY2U4YTMwZTJmNjQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UwZDhmY2QtZDMzNC00ZTFkLWE1NjQtMWE5YzE3NjlkMjkxIiwiaWF0IjoxNzczMTYyMTQ1fQ.udt1olLq2FtV5NqLlT4aKCqAwjrIOGAwD817SxNA0A8', 
    'Content-Type': 'application/json'
}

WEBHOOK_URL = 'https://n8n.srv1479281.hstgr.cloud/webhook/confirmacao-imediata'
AGENDAMENTO_ID = '8524d55b-d1b6-4397-807a-813f40070d95'

def monitor_test():
    try:
        # 1. Trigger Webhook
        print(f"Disparando teste para o agendamento {AGENDAMENTO_ID}...")
        payload = {
            "type": "INSERT",
            "table": "agendamentos",
            "record": { "id": AGENDAMENTO_ID },
            "body": { "record": { "id": AGENDAMENTO_ID } } # Double safe for n8n formats
        }
        req_web = urllib.request.Request(WEBHOOK_URL, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        urllib.request.urlopen(req_web, context=ctx)
        print("Webhook disparado!")
        
        # 2. Wait for n8n to process
        time.sleep(5)
        
        # 3. Find newest execution
        req_execs = urllib.request.Request('https://n8n.srv1479281.hstgr.cloud/api/v1/executions?limit=1', headers=N8N_HEADERS)
        exec_data = json.loads(urllib.request.urlopen(req_execs, context=ctx).read().decode('utf-8'))['data']
        
        if not exec_data:
            print("Nenhuma execução encontrada.")
            return

        execution_id = exec_data[0]['id']
        print(f"Ultima execução capturada: {execution_id} (Status: {exec_data[0]['status']})")
        
        # 4. Fetch node details
        req_details = urllib.request.Request(f'https://n8n.srv1479281.hstgr.cloud/api/v1/executions/{execution_id}?includeData=true', headers=N8N_HEADERS)
        details = json.loads(urllib.request.urlopen(req_details, context=ctx).read().decode('utf-8'))
        run_data = details.get('data', {}).get('resultData', {}).get('runData', {})
        
        # 5. Display logs
        print("\n--- RELATÓRIO DO FLUXO EM TEMPO REAL ---")
        for node_name, runs in run_data.items():
            status = "✅ SUCESSO" if 'error' not in runs[0] else "❌ ERRO"
            print(f"Node: {node_name} | Status: {status}")
            if 'z-api' in node_name.lower():
                print(f"   > Detalhes Z-API: {json.dumps(runs[0].get('data', {}).get('main', [{}])[0].get('json', {}), indent=2)}")
                
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    monitor_test()
