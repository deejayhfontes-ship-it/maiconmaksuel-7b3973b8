const https = require('https');

const PAT = 'sbp_d0c8db58f9799b7309cc1a2b52ea6c0d4cbd8590';
const PROJECT = 'hhzvjsrsoyhjzeiuxpep';

function runSQL(sql) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + PAT,
        'Content-Length': Buffer.byteLength(payload),
      }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(payload);
    req.end();
  });
}

(async () => {
  // Ver TODAS as dividas abertas com detalhes do atendimento e pagamentos
  const r = await runSQL(`
    SELECT 
      d.id AS divida_id,
      c.nome AS cliente,
      d.valor_original,
      d.valor_pago,
      d.saldo,
      d.status AS status_divida,
      d.data_vencimento,
      d.observacoes,
      a.id AS atendimento_id,
      a.status AS status_atendimento,
      a.numero_comanda,
      (
        SELECT STRING_AGG(p.forma_pagamento, ', ')
        FROM pagamentos p
        WHERE p.atendimento_id = a.id
      ) AS formas_pagamento_do_atendimento
    FROM dividas d
    LEFT JOIN atendimentos a ON a.id = d.atendimento_id
    LEFT JOIN clientes c ON c.id = d.cliente_id
    WHERE d.status IN ('aberta', 'parcial')
    ORDER BY d.data_vencimento ASC;
  `);

  let parsed;
  try { parsed = JSON.parse(r.body); } catch { console.log('Parse error:', r.body); return; }

  if (!Array.isArray(parsed)) { console.log('Erro:', r.body); return; }

  console.log(`=== TODAS as dividas abertas: ${parsed.length} ===\n`);
  
  parsed.forEach((row, i) => {
    const inconsistente = row.formas_pagamento_do_atendimento &&
      row.formas_pagamento_do_atendimento !== 'fiado' &&
      row.status_atendimento && ['finalizado','fechado'].includes(row.status_atendimento);
    
    console.log(`[${i+1}] ${row.cliente || 'N/A'} ${inconsistente ? '⚠️ INCONSISTENTE' : '✅ LEGITIMA'}`);
    console.log(`  Status divida:      ${row.status_divida}`);
    console.log(`  Status atendimento: ${row.status_atendimento || 'SEM ATENDIMENTO'}`);
    console.log(`  Comanda:            #${row.numero_comanda || '-'}`);
    console.log(`  Valor:              R$ ${row.valor_original} | Saldo: R$ ${row.saldo}`);
    console.log(`  Vencimento:         ${row.data_vencimento}`);
    console.log(`  Pagamentos:         ${row.formas_pagamento_do_atendimento || 'nenhum'}`);
    console.log(`  Obs:                ${row.observacoes || '-'}`);
    console.log('');
  });
})();
