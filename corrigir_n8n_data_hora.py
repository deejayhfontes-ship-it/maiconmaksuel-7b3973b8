"""
Corrige os workflows n8n para usar data_hora (datetime unico)
ao invés de campos separados data/hora.
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
HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}

SUPABASE_URL = 'https://hhzvjsrsoyhjzeiuxpep.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenZqc3Jzb3loanplaXV4cGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDY0MjYsImV4cCI6MjA4MzcyMjQyNn0.6zEEC9DGxoXNMAJ8w5plFusOn_OHRRQJjINkRZgpl_0'

def api_get(path):
    r = urllib.request.Request(N8N_URL + path, headers=HEADERS, method='GET')
    resp = urllib.request.urlopen(r, timeout=20, context=ctx)
    return json.loads(resp.read())

def api_put(path, body):
    data = json.dumps(body).encode()
    r = urllib.request.Request(N8N_URL + path, data=data, headers=HEADERS, method='PUT')
    resp = urllib.request.urlopen(r, timeout=20, context=ctx)
    return json.loads(resp.read())

def api_post(path, body=None):
    data = json.dumps(body or {}).encode()
    r = urllib.request.Request(N8N_URL + path, data=data, headers=HEADERS, method='POST')
    resp = urllib.request.urlopen(r, timeout=20, context=ctx)
    return json.loads(resp.read())


def corrigir_node_lembretes(node):
    """Corrige o node 'Buscar Agendamentos Amanha' para usar data_hora."""
    if 'Buscar Agendamentos' not in node.get('name', ''):
        return node, False

    params = node.get('parameters', {})
    query_params = params.get('queryParameters', {}).get('parameters', [])
    
    alterado = False
    novos_params = []
    tem_data_hora = any(p.get('name') == 'data_hora' for p in query_params)
    
    for p in query_params:
        nome = p.get('name', '')
        valor = p.get('value', '')
        
        # Remover filtros antigos de data/hora separados
        if nome in ('data', 'hora'):
            print(f"      Removendo query param antigo: {nome}={valor}")
            alterado = True
            continue  # pular este param
        
        # Manter select, status e outros
        if nome == 'select':
            # Atualizar o select para usar data_hora e incluir servicos/profissionais
            if 'data,hora' in valor or ('data_hora' not in valor):
                p['value'] = 'id,data_hora,status,clientes(nome,celular,telefone),servicos(nome),profissionais(nome)'
                print(f"      Atualizando select para: {p['value']}")
                alterado = True
        
        novos_params.append(p)
    
    # Adicionar filtro data_hora se não existir
    if not tem_data_hora:
        # Para lembretes: agendamentos de AMANHA (entre inicio e fim do dia seguinte)
        novos_params.append({
            'name': 'data_hora',
            'value': "=gte.{{ $today.plus({days:1}).startOf('day').toISO() }}"
        })
        novos_params.append({
            'name': 'data_hora',
            'value': "=lte.{{ $today.plus({days:1}).endOf('day').toISO() }}"
        })
        print("      Adicionando filtros data_hora (amanha inicio/fim)")
        alterado = True
    
    params['queryParameters']['parameters'] = novos_params
    node['parameters'] = params
    return node, alterado


def corrigir_node_avaliacao(node):
    """Corrige o node 'Buscar Agendamentos Ontem' para usar data_hora."""
    if 'Buscar Agendamentos' not in node.get('name', ''):
        return node, False

    params = node.get('parameters', {})
    query_params = params.get('queryParameters', {}).get('parameters', [])
    
    alterado = False
    novos_params = []
    tem_data_hora = any(p.get('name') == 'data_hora' for p in query_params)
    
    for p in query_params:
        nome = p.get('name', '')
        valor = p.get('value', '')
        
        if nome in ('data', 'hora'):
            print(f"      Removendo query param antigo: {nome}={valor}")
            alterado = True
            continue
        
        if nome == 'select':
            if 'data_hora' not in valor:
                p['value'] = 'id,data_hora,status,clientes(nome,celular)'
                print(f"      Atualizando select para: {p['value']}")
                alterado = True
        
        novos_params.append(p)
    
    if not tem_data_hora:
        # Para avaliacao: agendamentos de ONTEM
        novos_params.append({
            'name': 'data_hora',
            'value': "=gte.{{ $today.minus({days:1}).startOf('day').toISO() }}"
        })
        novos_params.append({
            'name': 'data_hora',
            'value': "=lte.{{ $today.minus({days:1}).endOf('day').toISO() }}"
        })
        print("      Adicionando filtros data_hora (ontem inicio/fim)")
        alterado = True
    
    params['queryParameters']['parameters'] = novos_params
    node['parameters'] = params
    return node, alterado


def corrigir_code_lembretes(node):
    """Corrige o node Code que formata a mensagem para usar data_hora."""
    if node.get('type') != 'n8n-nodes-base.code':
        return node, False
    
    params = node.get('parameters', {})
    codigo = params.get('jsCode', '')
    
    if 'ag.data' not in codigo and 'data_hora' in codigo:
        return node, False  # ja correto
    
    if 'ag.data' not in codigo:
        return node, False
    
    print("      Corrigindo codigo JavaScript (data/hora -> data_hora)...")
    
    # Novo codigo que usa data_hora
    novo_codigo = """const items = [];
for (const item of $input.all()) {
  const ag = item.json;
  const nome = (ag.clientes && ag.clientes.nome) ? ag.clientes.nome : 'Cliente';
  let celular = null;
  if (ag.clientes) {
    celular = ag.clientes.celular || ag.clientes.telefone || null;
  }
  if (!celular) continue;
  let phone = celular.replace(/\\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;

  // Formatar data_hora
  const dtRaw = ag.data_hora || '';
  let dataFormatada = '';
  let horaFormatada = '';
  if (dtRaw) {
    const dt = new Date(dtRaw);
    const dia = String(dt.getDate()).padStart(2, '0');
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const ano = dt.getFullYear();
    dataFormatada = `${dia}/${mes}/${ano}`;
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    horaFormatada = `${hh}:${mm}`;
  }

  const servico = (ag.servicos && ag.servicos.nome) ? ag.servicos.nome : 'servico';
  const profissional = (ag.profissionais && ag.profissionais.nome) ? `com ${ag.profissionais.nome}` : '';

  const mensagem = `Ola ${nome}! 😊\\n\\nLembrando que voce tem um agendamento amanha:\\n\\n📅 Data: ${dataFormatada}\\n🕐 Horario: ${horaFormatada}\\n✂️ Servico: ${servico} ${profissional}\\n\\nSalao Maicon Maksuel 💜\\nNos vemos amanha! Te esperamos!`;

  items.push({ json: { phone, mensagem } });
}
return items;"""
    
    params['jsCode'] = novo_codigo
    node['parameters'] = params
    print("      Codigo atualizado!")
    return node, True


def corrigir_code_avaliacao(node):
    """Corrige o node Code de avaliacao para usar data_hora."""
    if node.get('type') != 'n8n-nodes-base.code':
        return node, False
    
    params = node.get('parameters', {})
    codigo = params.get('jsCode', '')
    
    if 'ag.data' not in codigo and 'data_hora' in codigo:
        return node, False
    if 'ag.data' not in codigo:
        return node, False
    
    print("      Corrigindo codigo JavaScript de avaliacao (data/hora -> data_hora)...")
    
    novo_codigo = """const items = [];
for (const item of $input.all()) {
  const ag = item.json;
  const nome = (ag.clientes && ag.clientes.nome) ? ag.clientes.nome : 'Cliente';
  const celular = (ag.clientes && ag.clientes.celular) ? ag.clientes.celular : null;
  if (!celular) continue;
  let phone = celular.replace(/\\D/g, '');
  if (!phone.startsWith('55')) phone = '55' + phone;
  const mensagem = `Oi ${nome}! 😊 Obrigado pela visita ao salao Maicon Maksuel!\\n\\nComo foi sua experiencia conosco? Avalie de 1 a 5:\\n\\n1 - Ruim\\n2 - Regular\\n3 - Bom\\n4 - Otimo\\n5 - Excelente\\n\\nResponda com o numero da avaliacao. Sua opiniao e muito importante para nos! 💜`;
  items.push({ json: { phone, mensagem } });
}
return items;"""
    
    params['jsCode'] = novo_codigo
    node['parameters'] = params
    return node, True


print("=" * 60)
print("CORRIGINDO WORKFLOWS N8N - data_hora")
print("=" * 60)

lista = api_get('/api/v1/workflows')
workflows = lista.get('data', [])
print(f"Total: {len(workflows)} workflows\n")

for wf_resumo in workflows:
    wf_id   = wf_resumo['id']
    wf_name = wf_resumo['name']
    wf_ativo = wf_resumo.get('active', False)

    print(f"--- {wf_name} (ID: {wf_id})")

    wf = api_get(f'/api/v1/workflows/{wf_id}')
    nodes_originais = wf.get('nodes', [])
    nodes_corrigidos = []
    alguma_alteracao = False

    for node in nodes_originais:
        node_nome = node.get('name', '')
        
        # Selecionar funcao de correcao conforme o workflow
        if 'Lembretes' in wf_name or 'Lembrete' in wf_name:
            if 'Buscar Agendamentos' in node_nome:
                node, alt = corrigir_node_lembretes(node)
                alguma_alteracao = alguma_alteracao or alt
            elif node.get('type') == 'n8n-nodes-base.code':
                node, alt = corrigir_code_lembretes(node)
                alguma_alteracao = alguma_alteracao or alt
        
        elif 'Avaliacao' in wf_name or 'Avaliação' in wf_name:
            if 'Buscar Agendamentos' in node_nome:
                node, alt = corrigir_node_avaliacao(node)
                alguma_alteracao = alguma_alteracao or alt
            elif node.get('type') == 'n8n-nodes-base.code':
                node, alt = corrigir_code_avaliacao(node)
                alguma_alteracao = alguma_alteracao or alt
        
        nodes_corrigidos.append(node)

    if not alguma_alteracao:
        print("   Sem alteracoes necessarias.\n")
        continue

    # Desativar, salvar, reativar
    if wf_ativo:
        print("   Desativando...")
        try: api_post(f'/api/v1/workflows/{wf_id}/deactivate')
        except: pass

    wf['nodes'] = nodes_corrigidos
    print("   Salvando...")
    try:
        api_put(f'/api/v1/workflows/{wf_id}', wf)
        print("   Salvo!")
    except Exception as e:
        # Payload simplificado
        payload = {
            'name': wf['name'],
            'nodes': nodes_corrigidos,
            'connections': wf.get('connections', {}),
            'settings': wf.get('settings', {}),
        }
        api_put(f'/api/v1/workflows/{wf_id}', payload)
        print("   Salvo (payload simplificado)!")

    if wf_ativo:
        print("   Reativando...")
        try:
            api_post(f'/api/v1/workflows/{wf_id}/activate')
            print("   Ativo!\n")
        except Exception as e:
            print(f"   Erro ao reativar: {e}\n")
    else:
        print()

print("=" * 60)
print("CONCLUIDO! Workflows atualizados para usar data_hora.")
print("=" * 60)
