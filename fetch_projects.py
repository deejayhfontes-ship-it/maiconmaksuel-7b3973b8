import subprocess, json
p = subprocess.run(['curl.exe', '-s', 'https://api.supabase.com/v1/projects', '-H', 'Authorization: Bearer sbp_a1efd6232e48db3c84484cb743171c29cf1800fd'], capture_output=True)
data = json.loads(p.stdout.decode('utf-8'))
for proj in data:
    print(f"Project ID: {proj['id']} - {proj['name']}")
    print(f"  Ref: {proj.get('ref', proj['id'])}")
