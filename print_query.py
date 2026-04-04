import json
data = json.load(open('workflow_all_nodes.json', encoding='utf-8'))
for n in data:
    params = json.dumps(n.get('parameters', {}))
    if 'hhzvjsrsoyhjzeiuxpep' in params:
        print(f"Node: {n['name']}")
        print(f"URL: {n['parameters'].get('url', 'N/A')}")
        for qp in n['parameters'].get('queryParameters', {}).get('parameters', []):
            print(f"  {qp['name']} = {qp['value']}")
