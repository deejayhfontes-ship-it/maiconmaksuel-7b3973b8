import json

with open('projetos_supabase.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for p in data:
    print(f"ID: {p['id']} | Nome: {p['name']} | Status: {p['status']}")
