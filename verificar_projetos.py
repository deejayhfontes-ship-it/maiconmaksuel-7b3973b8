import urllib.request, json, ssl

ctx = ssl.create_default_context()
for pat in ['sbp_a1efd6232e48db3c84484cb743171c29cf1800fd', 'sbp_9d6ce1cc0224d6a1e8480919e91cc6e5a0cc1cbb']:
    print(f'\nTestando PAT: {pat[:20]}...')
    req = urllib.request.Request(
        'https://api.supabase.com/v1/projects',
        headers={'Authorization': f'Bearer {pat}'}
    )
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=10)
        data = json.loads(r.read())
        print('Projetos encontrados:')
        for p in data:
            print(f" - {p['id']} : {p['name']}")
    except urllib.error.HTTPError as e:
        print(f'ERRO {e.code}: {e.read().decode()[:200]}')
